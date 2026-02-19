/**
 * Result - Tipo para resultados de use cases
 */

/**
 * Resultado de sucesso
 */
export interface SuccessResult<T> {
  success: true;
  data: T;
}

/**
 * Resultado de erro
 */
export interface ErrorResult {
  success: false;
  error: string;
  code?: string;
}

/**
 * Resultado de uma operação (sucesso ou erro)
 */
export type Result<T> = SuccessResult<T> | ErrorResult;

/**
 * Helpers para criar resultados
 */
export const Results = {
  /**
   * Cria um resultado de sucesso
   */
  success<T>(data: T): SuccessResult<T> {
    return { success: true, data };
  },

  /**
   * Cria um resultado de erro
   */
  error(error: string, code?: string): ErrorResult {
    return { success: false, error, code };
  },

  /**
   * Verifica se é um resultado de sucesso
   */
  isSuccess<T>(result: Result<T>): result is SuccessResult<T> {
    return result.success === true;
  },

  /**
   * Verifica se é um resultado de erro
   */
  isError<T>(result: Result<T>): result is ErrorResult {
    return result.success === false;
  },
};
