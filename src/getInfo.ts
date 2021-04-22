import { Provider } from '@project-serum/anchor'
import {
  Account,
  Connection,
  PublicKey,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction
} from '@solana/web3.js'
import { TOKEN_VESTING_PROGRAM_ID, create, getContractInfo } from './main'
import { Schedule } from './state'

const connection = new Connection('https://api.mainnet-beta.solana.com')
const TOKEN_ADDRESS = new PublicKey('xuNGfwG8r3CEubQcssj3A7zoZwb4NaiamhHsJEMt7kf')
const SOURCE_TOKENS_ADDRESS = new PublicKey('35QuD9QWJDSLKJEmYrfuqgZK9e92Ea2rcwNfsCke7iUL')
const SEED_WORD = Buffer.from('Synthetify' + TOKEN_ADDRESS.toString())
console.log(SEED_WORD.toString())
export const getSeedWord = async (seed: Buffer) => {
  let seedWord = SEED_WORD.slice(0, 31)
  const [vestingAccountKey, bump] = await PublicKey.findProgramAddress(
    [seedWord],
    TOKEN_VESTING_PROGRAM_ID
  )
  seedWord = Buffer.from(seedWord.toString('hex') + bump.toString(16), 'hex')
  return seedWord
}
const main = async () => {
  const seedWord = await getSeedWord(SEED_WORD)
  console.log(seedWord.toString('hex'))
  const info = await getContractInfo(connection, new PublicKey(seedWord))
  console.log(info)
}
main()
