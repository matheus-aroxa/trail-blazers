import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Vacancy } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { RepositorySummary } from './types/repos-summary';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { FileSelectionError, RepoFileSelectorService } from './repo-file-selector.service';
import { ParsedVacancyProfile } from '../vacancies/schemas/vacancy.schema';

const MAX_CONTEXT_CHARS = 80000;
const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '.next',
  'out',
  'vendor',
  'public',
]);
const IGNORED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.pdf',
  '.zip',
  '.exe',
  '.dll',
  '.lock',
]);
const IGNORED_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);

export interface ProcessedRepository {
  relevantFiles: { path: string; content: string }[];
  omittedFiles: string[];
  totalTokensEstimative: number;
}

type file = { path: string; content: string };

interface GithubRepoResponse {
  id: number;
  name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  private: boolean;
}

interface GithubTreeNode {
  path: string;
  type: 'blob' | 'tree' | 'commit';
}

interface GithubTreeResponse {
  tree: GithubTreeNode[];
  truncated?: boolean;
}

const GITHUB_REPOS_URL =
  'https://api.github.com/user/repos?per_page=100&sort=full_name&affiliation=owner';

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly fileSelector: RepoFileSelectorService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async listForUser(userId: string): Promise<RepositorySummary[]> {
    const token = await this.usersService.getGithubToken(userId);

    if (!token) {
      throw new UnauthorizedException('Token do GitHub não encontrado. Faça login novamente.');
    }

    const response = await fetch(GITHUB_REPOS_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'trail-blazers-backend',
      },
    });

    if (!response.ok) {
      throw this.mapGithubError(response);
    }

    const repos = (await response.json()) as GithubRepoResponse[];

    return repos.map((repo) => ({
      id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      description: repo.description,
      language: repo.language,
      visibility: repo.private ? 'private' : 'public',
    }));
  }

  private mapGithubError(response: Response): HttpException {
    const isRateLimited =
      (response.status === 403 || response.status === 429) &&
      response.headers.get('x-ratelimit-remaining') === '0';

    if (isRateLimited) {
      const resetHeader = response.headers.get('x-ratelimit-reset');
      const retryAfterSeconds = resetHeader
        ? Math.max(0, Number(resetHeader) - Math.floor(Date.now() / 1000))
        : undefined;

      return new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'limite_github_atingido',
          message: 'O GitHub limitou nossas requisições por agora. Tente novamente em instantes.',
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return new HttpException(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        code: 'erro_github',
        message: 'Não foi possível buscar seus repositórios no GitHub agora.',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
  async analyzeRepositoryContent(
    userId: string,
    owner: string,
    repo: string,
    vacancyId: string,
  ): Promise<ProcessedRepository> {
    if (!vacancyId) {
      throw new HttpException(
        {
          code: 'vacancy_id_obrigatorio',
          message: 'Selecione uma vaga antes de analisar o repositório.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const cacheKey = `repo_analysis_${userId}_${owner}_${repo}_${vacancyId}`;

    const cachedData = await this.cacheManager.get<ProcessedRepository>(cacheKey);
    if (cachedData) {
      console.log(`\n[CACHE] Servindo análise do repositório ${owner}/${repo}.`);
      return cachedData;
    }

    const vacancy = await this.prisma.vacancy.findFirst({
      where: { id: vacancyId, userId },
    });
    if (!vacancy) throw new NotFoundException('Vaga não encontrada.');

    const profile = this.requireVacancyProfile(vacancy);

    const token = await this.usersService.getGithubToken(userId);
    if (!token) throw new UnauthorizedException('Token do GitHub não encontrado.');

    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'trail-blazers-backend',
        },
      },
    );

    if (!treeResponse.ok) throw this.mapGithubError(treeResponse);

    const treeData = (await treeResponse.json()) as GithubTreeResponse;

    let candidatePaths: string[] = treeData.tree
      .filter((node) => node.type === 'blob')
      .map((node) => node.path)
      .filter((path) => this.isFileRelevant(path));

    if (String(candidatePaths).length === 0) {
      throw new HttpException(
        {
          code: 'repo_vazio',
          message:
            'Não encontramos código-fonte analisável. O repositório pode estar vazio ou conter apenas dependências/artefatos.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      candidatePaths = await this.fileSelector.selectRelevantFiles(candidatePaths, {
        rawDescription: vacancy.rawDescription,
        profile,
      });
    } catch (err) {
      if (!(err instanceof FileSelectionError)) throw err;

      const retryable = err.reason !== 'invalid_api_key' && err.reason !== 'payment_required';
      throw new HttpException(
        { code: 'ia_indisponivel', message: err.message, retryable },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const relevantFiles: file[] = [];
    const omittedFiles: string[] = [];
    let currentCharCount = 0;

    for (const path of candidatePaths) {
      if (currentCharCount >= MAX_CONTEXT_CHARS) {
        omittedFiles.push(path);
        continue;
      }

      const content = await this.fetchFileRawContent(owner, repo, path, token);

      if (currentCharCount + content.length <= MAX_CONTEXT_CHARS) {
        relevantFiles.push({ path, content });
        currentCharCount += content.length;
      } else {
        omittedFiles.push(path);
      }
    }

    console.log(`\n=== Análise do Repositório: ${owner}/${repo} ===`);
    console.log(`✓ Arquivos armazenados com sucesso (${relevantFiles.length}):`);

    relevantFiles.forEach((file) => {
      console.log(`  ├── ${file.path} (${file.content.length} caracteres)`);
    });

    console.log(`\n⚠ Arquivos omitidos por limite de tokens: ${omittedFiles.length}`);
    console.log(`Total de tokens estimado: ${Math.ceil(currentCharCount / 4)}`);
    console.log(`=====================================================\n`);

    const result: ProcessedRepository = {
      relevantFiles,
      omittedFiles,
      totalTokensEstimative: Math.ceil(currentCharCount / 4),
    };

    await this.cacheManager.set(cacheKey, result);
    return result;
  }

  private requireVacancyProfile(vacancy: Vacancy): ParsedVacancyProfile {
    if (vacancy.parseStatus === 'pending') {
      throw new HttpException(
        {
          code: 'vaga_ainda_analisando',
          message: 'A análise da vaga ainda não terminou. Aguarde para escolher o repositório.',
        },
        HttpStatus.CONFLICT,
      );
    }

    if (vacancy.parseStatus === 'failed' || vacancy.parsedOutOfScope) {
      throw new HttpException(
        {
          code: 'vaga_sem_perfil',
          message:
            'Não foi possível extrair um perfil técnico desta vaga. Tente reanalisar a vaga ou edite a descrição.',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return {
      technologies: (vacancy.parsedStack ?? []) as string[],
      seniorityLevel: (vacancy.parsedSeniority ??
        'unknown') as ParsedVacancyProfile['seniorityLevel'],
      keyCompetencies: (vacancy.parsedSkills ?? []) as string[],
      confidence: vacancy.parseConfidence === 1.0 ? 'high' : 'low',
      outOfScope: vacancy.parsedOutOfScope ?? false,
    };
  }

  private isFileRelevant(path: string): boolean {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    const extension = fileName.includes('.')
      ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
      : '';

    if (parts.some((part) => IGNORED_DIRS.has(part))) return false;
    if (IGNORED_FILES.has(fileName) || IGNORED_EXTENSIONS.has(extension)) return false;

    return true;
  }

  private async fetchFileRawContent(
    owner: string,
    repo: string,
    path: string,
    token: string,
  ): Promise<string> {
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok ? await res.text() : '';
  }
}
