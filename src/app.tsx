import { useEffect, useState } from "react"

const TOKENS = {
  ILLEGAL: 'illegal',
  EOF: 'eof',

  IDENT: 'ident',
  NUMBER: 'number',
  STRING: 'string',

  COMMA: ',',

  EQ: 'é',
  AND: 'e',
  OR: 'ou',
  NOT: 'não',
  NEQ: 'não é',


  GT: 'maior que',
  LT: 'menor que',
  GTE: 'maior ou igual a',
  LTE: 'menor ou igual a',

  LPAREN: '(',
  RPAREN: ')',

  PARAM: 'param',
}

class Token {
  constructor(public type: string, public value: string) { }
}

class Tokenizer {
  private pos = 0
  private input: string = ''

  constructor(
    private customTokens: CustomToken[]
  ) { }

  public setInput(input: string) {
    this.input = input
    this.pos = 0
  }

  private isEOF() {
    return this.pos >= this.input.length
  }

  private peek() {
    return this.input[this.pos]
  }

  private consume() {
    return this.input[this.pos++]
  }

  private consumeWhile(predicate: (char: string) => boolean) {
    let result = ''
    while (!this.isEOF() && predicate(this.peek())) {
      result += this.consume()
    }
    return result
  }

  private consumeWhitespace() {
    this.consumeWhile(char => char === ' ')
  }

  private consumeString() {
    this.consume() // consume opening quote
    const value = this.consumeWhile(char => char !== '"')
    this.consume() // consume closing quote
    return value
  }

  private consumeNumber() {
    const value = this.consumeWhile(char => /\d/.test(char))
    if (this.peek() === '.') {
      this.consume()
      return value + '.' + this.consumeWhile(char => /\d/.test(char))
    }
    return value
  }

  private consumeCustomToken() {
    for (const token of this.customTokens) {
      const match = this.consumeWhile(char => token.regex.test(char))
      console.log(match, token.regex)
      if (match) {
        return match
      }
    }
    return ''
  }

  private error(message: string) {
    throw new Error(message)
  }

  private tokenizeString() {
    return new Token(TOKENS.STRING, this.consumeString())
  }

  private tokenizeNumber() {
    return new Token(TOKENS.NUMBER, this.consumeNumber())
  }

  private tokenizeCustomToken() {
    const value = this.consumeCustomToken()
    if (!value) {
      this.error('Invalid token')
    }
    return new Token(TOKENS.IDENT, value)
  }

  private tokenizeIt() {
    this.consumeWhitespace()

    if (this.isEOF()) {
      return new Token(TOKENS.EOF, '')
    }

    const char = this.peek()

    if (char === '"') {
      return this.tokenizeString()
    }

    if (/\d/.test(char)) {
      return this.tokenizeNumber()
    }

    return this.tokenizeCustomToken()
  }

  public tokenize() {
    const tokens = []
    let token = this.tokenizeIt()
    while (token.type !== TOKENS.EOF) {
      tokens.push(token)
      token = this.tokenizeIt()
    }
    return tokens
  }
}

type CustomToken = {
  type: string
  regex: RegExp
  validateValue: (value: string[]) => Promise<{ valid: boolean, message: string }>
}

const tokenizer = new Tokenizer(
  [
    {
      type: TOKENS.PARAM, regex: /p|r|o|d|u|t|o/, validateValue: async (value: string[]) => {
        const productCodes = ['102234', '12233']
        const exists = productCodes.includes(value[0])
        return { valid: exists, message: `Código de produto ${value[0]} não encontrado` }
      }
    },
    {
      type: TOKENS.PARAM, regex: /c|a|t|e|g|o|r|i|a/, validateValue: async (value: string[]) => {
        const categoryCodes = ['12345', '1234', '1233']
        const exists = value.every(v => categoryCodes.includes(v))
        return { valid: exists, message: `Código de categoria não encontrado` }
      }
    },
    {
      type: TOKENS.PARAM, regex: /p|r|e|ç|o/, validateValue: async (value: string[]) => {
        if (value.length !== 1) {
          return { valid: false, message: 'Preço deve ter um valor e apenas um valor' }
        }

        const price = parseInt(value[0])

        return { valid: !isNaN(price), message: 'Preço inválido' }
      }
    }
  ]
)

export function App() {
  const [tokens, setTokens] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      tokenizer.setInput(input)
      const tokens = tokenizer.tokenize()
      setTokens(tokens.map(token => `${token.type}: ${token.value}`))
      setError(null)
    } catch (e) {
      setTokens([])
      if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('An error occurred')
      }
    }
  }, [input])

  return <>
    <p>
      Os parametros devem ser dinamicos e passados como um par de chave e uma lista de valores possíveis.

      Exemplo:
      <pre>
        <code>
          produto é 102234 e categoria em 12345, 1234, 1233 e preço maior que 1000 e produto não é 12233
        </code>
      </pre>
    </p>

    <textarea placeholder="Expressão"
      value={input}
      onChange={e => setInput(e.target.value)}
    />
    <pre>
      <code>Tokens: {JSON.stringify(tokens)}</code>
    </pre>

    {error && <p style={{ color: 'red' }}>{error}</p>}

    <ul>
      {tokens.map((token, i) => <li key={i}>{token}</li>)}
    </ul>
  </>
}


// ? Tokenization
// produto em 102234, 12233
// ------- -- ------ -- ----
// [0]     [1] [2] [3] [4]
// PARAM('produto') IN VALUE('102234'), COMMA, VALUE('12233')

// produto é 102234 e categoria em 12345, 1234, 1233 e preço maior que 1000 e produto não é 12233
// ------- -- ------ -- -------- -- ------- -- ------ -- ---- -- ----- ---- -- ------- --- ------
// [0]     [1] [2] [3] [4]      [5] [6] [7] [8] [9] [10] [11] [12] [13] [14] [15] [16] [17] [18]
// PARAM('produto') EQ VALUE('102234')
// AND 
// PARAM('categoria') IN VALUE('12345') COMMA  VALUE('1234') COMMA VALUE('1233')
// AND 
// PARAM('preço') GT VALUE('1000')
// AND
// PARAM('produto') NEQ VALUE('12233')

// ? Parsing
// produto é 102234 e categoria em 12345, 1234, 1233 e preço maior que 1000 e produto não é 12233
// AND
//   EQ
//     PARAM('produto')
//     VALUE('102234')
// AND
//   IN
//     PARAM('categoria')
//     VALUE('12345') COMMA VALUE('1234') COMMA VALUE('1233')
// AND
//   GT
//     PARAM('preço')
//     VALUE('1000')
// AND
//   NEQ
//     PARAM('produto')
//     VALUE('12233')

// ? Custom Tokens
// produto em 102234, 12233
// ------- -- ------ -- ----
// [0]     [1] [2] [3] [4]
// PARAM('produto') IN VALUE('102234'), COMMA, VALUE('12233')
// - Validar que o parametro é um produto
// - Validar que os valores são códigos de produtos válidos
