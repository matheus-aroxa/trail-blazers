import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateVacancyDto {
  @IsNotEmpty({
    message: 'A descrição da vaga não pode estar vazia.',
  })
  @IsString({
    message: 'A descrição da vaga deve ser um texto.',
  })
  @MinLength(50, {
    message: 'A descrição precisa ter no mínimo 50 caracteres.',
  })
  @MaxLength(5000, {
    message: 'A descrição excede o limite máximo permitido.',
  })
  description: string;
}
