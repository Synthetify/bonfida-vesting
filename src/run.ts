import { Provider } from '@project-serum/anchor'
import { Token, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
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

const connection = new Connection('https://solana-api.projectserum.com')
const TOKEN_ADDRESS = new PublicKey('4dmKkXNHdgYsXqBHCuMikNQWwVomZURhYvkkX5c4pQ7y')
const SOURCE_TOKENS_ADDRESS = new PublicKey('5GxsSbhYz7eQHAdbbWZpeyynNHPk2kXHvvEPgLEKrYoP')

const VESTING_START = new Numberu64(1619610925)
const QUARTERLY_SLOTS = new Numberu64(90 * 24 * 60 * 60) // onde quarter

// fields to change for each investor
const DESTINATION_ADDRESS = new PublicKey('7D5ZwmDH9HPJ3konuh5HRtVnWE1f7sKDz1pqyJ9LDcUP')
const AMOUNT = new Numberu64(20000000 * 1e6) // 6 decimals

const SEED = Buffer.from(DESTINATION_ADDRESS.toString())
// console.log(SEED.toString('hex'))
const getSchedule = () => {
  const shedules: Schedule[] = []
  // const initial = new Numberu64(AMOUNT.divn(10).toString()) // 10% on start
  // shedules.push(new Schedule(VESTING_START, initial))

  const quaterlyPart = new Numberu64(AMOUNT.divn(16).toString()) // 4 years x 4 Quarters Ignore rounding errors
  for (let index = 0; index < 16; index++) {
    shedules.push(
      new Schedule(
        new Numberu64(VESTING_START.add(QUARTERLY_SLOTS.muln(index + 1)).toString()),
        quaterlyPart
      )
    )
  }
  // console.log(shedules)
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
  const associatedAddress = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    TOKEN_ADDRESS,
    DESTINATION_ADDRESS
  )
  const associatedAddressIx = await Token.createAssociatedTokenAccountInstruction(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    TOKEN_ADDRESS,
    associatedAddress,
    DESTINATION_ADDRESS,
    wallet.publicKey
  )
  console.log('associatedAddress')
  console.log(associatedAddress.toString())
  const seedWord = await getSeedWord(SEED)
  console.log('seed word')
  console.log(seedWord.toString('hex'))

  const shedule = getSchedule()
  const ixs = await create(
    connection,
    TOKEN_VESTING_PROGRAM_ID,
    seedWord,
    wallet.publicKey,
    wallet.publicKey,
    SOURCE_TOKENS_ADDRESS,
    associatedAddress, // Destination
    TOKEN_ADDRESS,
    shedule
  )
  const tx = new Transaction().add(associatedAddressIx).add(...ixs)

  const blockhash = await connection.getRecentBlockhash(Provider.defaultOptions().commitment)
  tx.feePayer = wallet.pubKey
  tx.recentBlockhash = blockhash.blockhash
  console.log('Amount:')
  console.log(AMOUNT.divn(10 ** 6).toString())
  console.log('Address:')
  console.log(DESTINATION_ADDRESS.toString())
  const txsigned = (await wallet.signTransaction(tx)) as Transaction

  const signature = await sendAndConfirmRawTransaction(connection, txsigned.serialize(), {
    skipPreflight: true
  })
  console.log(signature)
}
main()
