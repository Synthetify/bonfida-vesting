import { Provider } from '@project-serum/anchor'
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'
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
import { ASSOCIATED_TOKEN_PROGRAM_ID, findAssociatedTokenAddress, Numberu64 } from './utils'
import { WalletProviderFactory } from './walletProvider/factory'
import { DERIVATION_PATH } from './walletProvider/localStorage'

const connection = new Connection('https://solana-api.projectserum.com')
const TOKEN_ADDRESS = new PublicKey('4dmKkXNHdgYsXqBHCuMikNQWwVomZURhYvkkX5c4pQ7y')

// fields to change for each investor
const DESTINATION_ADDRESS = new PublicKey('AYmPSMsvWBPFso3HB9r7ukaTQFQTvZ9V3rMWdH6gkdZU')

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
  const tx = new Transaction().add(associatedAddressIx)

  const blockhash = await connection.getRecentBlockhash(Provider.defaultOptions().commitment)
  tx.feePayer = wallet.pubKey
  tx.recentBlockhash = blockhash.blockhash
  const txsigned = (await wallet.signTransaction(tx)) as Transaction

  console.log(associatedAddress.toString())
  const signature = await sendAndConfirmRawTransaction(connection, txsigned.serialize(), {
    skipPreflight: true,
    commitment: 'single'
  })
}
main()
