# Notes 
<br><br><br><br>

 ## Railgun Differences across deployment upgrades.
  ### V1 > V2
  - event ABI's upgraded, name changed, funcSig change (inputs)
  - transact() function ABI Changed, inputs were altered.

  ### V2 > V2.1
  - Shield event ABI Changed. inputs were altered.

<br><br><br><br>

# TODO

* handle 0 events found on subsquid initial query,
* wire in proper read-attestation flow for source-aggregator 
* remove 'solo' test in source-aggregator.test.ts

> figure out 'output' model, ideally we receive chunks of 'data' from the source at a time if applicable. 
>> #### 'consumable'
>>> [[ ]]  - consolidate events from rpc into a format similar to the granular current 'exploded' serialization
>> #### 'raw-chronological'
>>> [[ ]]  - subsuid would need an entire refactor. 
>>>

<br><br><br><br>


# subsquid 

## transactions- 
  - id:  ***tuple(blockNumber, transactionIndexInBlock, rgTransactionBatchIndex)***

## commitments- 
  - id: ***tuple(treeNumber, treePosition)***
  - (*hash*): UTXO merkletree leaf. ***(valid for all commitment types)***
    > Logic explained how this is calculated below

    # Each event log contains an array of commitments
    ## LegacyGeneratedCommitment <br> ShieldCommitment
   
      > These are broken down into individual 'commitment'(s) extracted from ***eventLog (GeneratedCommitmentBatcch | Shield)***
      >> ***This eventLog contains an array of commitment struct.***
  ```typescript
            // - ERC20: (commitment leaf hash)
            const hash = poseidon([
              npk, 
              tokenAddress, // called tokenID
              value
            ])

            // (or.)
            // - ERC721: (commitment leaf hash)
            const hash = keccak256(combine([
              tokenType, // i believe its (ENUM) 1 or 2 for NFT?
              tokenAddress,
              tokenSubID
            ]))
  ```

# Each event log contains an array of ciphertext
## LegacyEncryptedCommitment <br> TransactCommitment

  > These are broken down into individual 'commitment'(s) extracted from ***event (CommitmentBatch | Transact)***
  >> ***This eventLog contains an array of ciphertext struct.***

   - ***(hash)***: 
      - comes directly out of the decoded log args hash[] 
      - each ciphertext in the ciphertext[index] pairs/relates with its corresponding hash[index]

<br><br><br><br>

# (extra...)

  ## transactions- 
    - contains:
      - full utxo commitment leaf hash list???
        - commitments[] = the associated commitments with the log
      - full nullifier list
        -nullifiers[] = the associated nullifiers with the log
      - full unshield 

  ## commitments- 
    - contains:
      - full utxo commitment list
      - in an aggregated chronological list

  ## nullifiers-
    - id: padded nullifier
    - nullifier: nullifier seen in an eventlog during a railgun transaction

  ## unshields-
    - id: transactionHash
