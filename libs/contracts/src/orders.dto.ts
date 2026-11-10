import {
  IsInt,
  IsNumber,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsString()
  @MinLength(3)
  description: string;

  // Simplificação didática: number. Em sistemas financeiros prefira centavos
  // inteiros ou strings decimais para evitar problemas de precisão.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  total: number;
}
