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
import { getSeedWord } from './getInfo'
import { TOKEN_VESTING_PROGRAM_ID, create } from './main'
import { Schedule } from './state'
import { findAssociatedTokenAddress, Numberu64 } from './utils'
import { WalletProviderFactory } from './walletProvider/factory'
import { DERIVATION_PATH } from './walletProvider/localStorage'

const connection = new Connection('https://api.mainnet-beta.solana.com')
const TOKEN_ADDRESS = new PublicKey('xuNGfwG8r3CEubQcssj3A7zoZwb4NaiamhHsJEMt7kf')
const SOURCE_TOKENS_ADDRESS = new PublicKey('35QuD9QWJDSLKJEmYrfuqgZK9e92Ea2rcwNfsCke7iUL')

const VESTING_START = new Numberu64(74833744)
const QUARTERLY_SLOTS = new Numberu64(90 * 24 * 60 * 60 * 2) // 15_552_000 assuming 0.5s block time

// fields to change for each investor
const DESTINATION_ADDRESS = new PublicKey('35QuD9QWJDSLKJEmYrfuqgZK9e92Ea2rcwNfsCke7iUL')
const AMOUNT = new Numberu64(500 * 1e6) // 6 decimals

const SEED = Buffer.from(DESTINATION_ADDRESS.toString())

const getSchedule = () => {
  const shedules: Schedule[] = []
  const initial = AMOUNT.divn(10) // 10% on start
  shedules.push(new Schedule(VESTING_START, initial))

  const quaterlyPart = AMOUNT.sub(initial).divn(16) // 4 years x 4 Quarters Ignore rounding errors
  for (let index = 0; index < 16; index++) {
    shedules.push(new Schedule(VESTING_START.add(QUARTERLY_SLOTS.muln(index + 1)), quaterlyPart))
  }
  return shedules
}

const main = async () => {
  const args = {
    onDisconnect: () => {
      console.log('disconnected')
    },
    derivationPath: DERIVATION_PATH.bip44Root
  }

  const wallet = WalletProviderFactory.getProvider(args)
  await wallet.init()
  if (!wallet.publicKey) {
    throw new Error('failed to connect')
  }

  const shedule = getSchedule()
  const ixs = await create(
    connection,
    TOKEN_VESTING_PROGRAM_ID,
    await getSeedWord(SEED),
    wallet.publicKey,
    wallet.publicKey,
    SOURCE_TOKENS_ADDRESS,
    DESTINATION_ADDRESS, // Destination
    TOKEN_ADDRESS,
    shedule
  )
  const tx = new Transaction().add(...ixs)

  const blockhash = await connection.getRecentBlockhash(Provider.defaultOptions().commitment)
  tx.feePayer = wallet.pubKey
  tx.recentBlockhash = blockhash.blockhash
  const txsigned = (await wallet.signTransaction(tx)) as Transaction

  const signature = await sendAndConfirmRawTransaction(connection, txsigned.serialize(), {
    skipPreflight: true
  })
  console.log(signature)
}
main()
