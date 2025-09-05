export const idlFactory = ({ IDL }) => {
  const AlgorandAddress = IDL.Record({
    'public_key' : IDL.Vec(IDL.Nat8),
    'address' : IDL.Text,
  });
  const SigningError = IDL.Record({ 'code' : IDL.Nat32, 'message' : IDL.Text });
  const SigningResult = IDL.Variant({
    'Ok' : AlgorandAddress,
    'Err' : SigningError,
  });
  const SignedTransaction = IDL.Record({
    'signature' : IDL.Vec(IDL.Nat8),
    'transaction_bytes' : IDL.Vec(IDL.Nat8),
    'signed_tx_id' : IDL.Text,
  });
  const TransactionSigningResult = IDL.Variant({
    'Ok' : SignedTransaction,
    'Err' : SigningError,
  });
  return IDL.Service({
    'derive_algorand_address' : IDL.Func([IDL.Principal], [SigningResult], []),
    'get_canister_status' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        ['query'],
      ),
    'greet' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'sign_algorand_transaction' : IDL.Func(
        [IDL.Principal, IDL.Vec(IDL.Nat8)],
        [TransactionSigningResult],
        [],
      ),
    'verify_signature' : IDL.Func(
        [IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8)],
        [IDL.Bool],
        ['query'],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
