import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AlgorandAddress {
  'public_key' : Uint8Array | number[],
  'address' : string,
}
export interface SignedTransaction {
  'signature' : Uint8Array | number[],
  'transaction_bytes' : Uint8Array | number[],
  'signed_tx_id' : string,
}
export interface SigningError { 'code' : number, 'message' : string }
export type SigningResult = { 'Ok' : AlgorandAddress } |
  { 'Err' : SigningError };
export type TransactionSigningResult = { 'Ok' : SignedTransaction } |
  { 'Err' : SigningError };
export interface _SERVICE {
  'derive_algorand_address' : ActorMethod<[Principal], SigningResult>,
  'get_canister_status' : ActorMethod<[], Array<[string, string]>>,
  'greet' : ActorMethod<[string], string>,
  'sign_algorand_transaction' : ActorMethod<
    [Principal, Uint8Array | number[]],
    TransactionSigningResult
  >,
  'verify_signature' : ActorMethod<
    [Uint8Array | number[], Uint8Array | number[], Uint8Array | number[]],
    boolean
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
