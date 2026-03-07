/**
 * translateError — Traduz mensagens de erro do Supabase e da rede para português.
 * Recebe um Error, objeto {message} ou string e retorna uma mensagem legível.
 */

const TRANSLATIONS = [
  // Auth — credenciais
  ['Invalid login credentials',               'E-mail ou senha incorretos.'],
  ['Email not confirmed',                      'E-mail não confirmado. Verifique sua caixa de entrada.'],
  ['User already registered',                  'Este e-mail já está cadastrado.'],
  ['User not found',                           'Usuário não encontrado.'],
  ['Signup is disabled',                       'Cadastro desabilitado. Entre em contato com o administrador.'],

  // Auth — senha
  ['Password should be at least 6 characters', 'A senha deve ter pelo menos 6 caracteres.'],
  ['New password should be different',         'A nova senha deve ser diferente da senha atual.'],
  ['Auth session missing',                     'Sessão não encontrada. Faça login novamente.'],
  ['Auth session expired',                     'Sessão expirada. Faça login novamente.'],
  ['JWT expired',                              'Sua sessão expirou. Faça login novamente.'],
  ['Invalid JWT',                              'Sessão inválida. Faça login novamente.'],
  ['Token has expired',                        'O link expirou. Solicite um novo.'],
  ['invalid claim',                            'Sessão inválida. Faça login novamente.'],

  // Rate limit / rede
  ['Email rate limit exceeded',               'Muitas tentativas. Aguarde alguns minutos e tente novamente.'],
  ['Too many requests',                        'Muitas requisições. Tente novamente em breve.'],
  ['Failed to fetch',                          'Falha na conexão. Verifique sua internet.'],
  ['Network request failed',                   'Falha na conexão. Verifique sua internet.'],
  ['Load failed',                              'Falha na conexão. Verifique sua internet.'],
  ['fetch',                                    'Falha na conexão. Verifique sua internet.'],

  // Banco de dados — RLS / permissões
  ['row-level security policy',               'Sem permissão para realizar esta ação.'],
  ['permission denied',                        'Sem permissão para realizar esta ação.'],
  ['insufficient_privilege',                   'Sem permissão para realizar esta ação.'],

  // Banco de dados — integridade
  ['duplicate key value',                      'Já existe um registro com estes dados.'],
  ['unique constraint',                        'Já existe um registro com estes dados.'],
  ['null value in column',                     'Preencha todos os campos obrigatórios.'],
  ['not-null constraint',                      'Preencha todos os campos obrigatórios.'],
  ['violates foreign key constraint',          'Não é possível remover: existem registros vinculados.'],
  ['foreign key',                              'Não é possível remover: existem registros vinculados.'],
  ['value too long',                           'Um dos campos excede o tamanho máximo permitido.'],

  // Storage
  ['The resource already exists',             'Arquivo já existe. Tente novamente.'],
  ['Object not found',                         'Arquivo não encontrado.'],
  ['Bucket not found',                         'Configuração de armazenamento não encontrada.'],
  ['mime type',                                'Tipo de arquivo não permitido.'],
  ['exceeded the maximum allowed size',        'Arquivo muito grande. Reduza o tamanho e tente novamente.'],
]

export function translateError(err) {
  const msg = (typeof err === 'string' ? err : err?.message ?? '') || ''

  for (const [pattern, translation] of TRANSLATIONS) {
    if (msg.toLowerCase().includes(pattern.toLowerCase())) {
      return translation
    }
  }

  // Se a mensagem já estiver em português (não contém letras ASCII puras comuns do inglês)
  // ou for genérica, retorna ela mesma; caso contrário, mensagem padrão.
  if (msg && !/^[A-Za-z\s]+$/.test(msg.slice(0, 20))) {
    return msg
  }

  return msg || 'Ocorreu um erro inesperado. Tente novamente.'
}
