### Reddit community points simulations/experiments repository

Repository accompanying the rollup diff compression research, using the Reddit's airdrop as a usecase.

You can read more about the research [here](https://medium.com/privacy-scaling-explorations/rollup-diff-compression-application-level-compression-strategies-to-reduce-the-l2-data-footprint-d14291acc825).

Datasets used in this experiment:

- `bricks` (`r/FortNiteBR`),
- `moons` (`r/CryptoCurrencies`). 
  
You can find the original dataset data for all of the 13 distributions in the `data/raw` directory.


#### Install instructions:
```
yarn install
```

#### Usage guide:

The repository is setup to be used by running commands from the command line. The `yargs` package is used 
for parsing command line arguments and executing the appropriate scripts. The generated outputs are stored under 
the `./data` directory, grouped in a separate sub-directory, determined by the action that is being executed.

The experiment is separated in multiple stages, commands for each stage are given below.

Here is a short description about each stage:
- **Convert** - converts the original .csv data to .json format for easier processing
- **Group** - pre-processes and groups the data according to the specific strategy (e.g. rlp, native, bitmap)
- **Encode** - serializes the data to byte representation - this is needed to run accurate calculations as the data is sent serialized to the smart contracts
- **Compute** - computes the gas costs and byte size stats for the chose strategy
- **Stats** - computes stats for the data structure of the distribution, distribution of users as well as the largest group in the distribution
- **Tables** - creates markdown tables from the stats - either comparison tables between different strategies 
  (base case vs compressed) or basic stats table for the dataset (byte size and gas costs)

1. **Convert**: 
   - `node scripts/main.js convert --dataset bricks` - Bricks dataset
   - `node scripts/main.js convert --dataset moons` - Moons dataset
    
2. **Group**:
   - `node scripts/main.js group --dataset bricks --encType rlp` - Bricks dataset, RLP strategy
   - `node scripts/main.js group --dataset bricks --encType native` - Bricks dataset, native strategy
   - `node scripts/main.js group --dataset bricks --encType bitmap` - Bricks dataset, bitmap strategy
   - `node scripts/main.js group --dataset moons --encType rlp` - Moons dataset, RLP strategy
   - `node scripts/main.js group --dataset moons --encType native` - Moons dataset, native strategy
   - `node scripts/main.js group --dataset moons --encType bitmap` - Moons dataset, bitmap strategy

3. **Encode**:
   - `node scripts/main.js encode --dataset bricks --encType rlp` - Bricks dataset, RLP strategy
   - `node scripts/main.js encode --dataset bricks --encType native` - Bricks dataset, native strategy
   - `node scripts/main.js encode --dataset bricks --encType bitmap` - Bricks dataset, bitmap strategy
   - `node scripts/main.js encode --dataset moons --encType rlp` - Moons dataset, RLP strategy
   - `node scripts/main.js encode --dataset moons --encType native` - Moons dataset, native strategy
   - `node scripts/main.js encode --dataset moons --encType bitmap` - Moons dataset, bitmap strategy

4. **Compute**:
   - `node scripts/main.js compute --dataset bricks --encType rlp` - Bricks dataset, RLP strategy
   - `node scripts/main.js compute --dataset bricks --encType native` - Bricks dataset, native strategy
   - `node scripts/main.js compute --dataset bricks --encType bitmap` - Bricks dataset, bitmap strategy
   - `node scripts/main.js compute --dataset moons --encType rlp` - Moons dataset, RLP strategy
   - `node scripts/main.js compute --dataset moons --encType native` - Moons dataset, native strategy
   - `node scripts/main.js compute --dataset moons --encType bitmap` - Moons dataset, bitmap strategy

5. **Stats**:
   - `node scripts/main.js stats --dataset bricks --encType rlp` - Bricks dataset, RLP strategy
   - `node scripts/main.js stats --dataset bricks --encType native` - Bricks dataset, native strategy
   - `node scripts/main.js stats --dataset bricks --encType bitmap` - Bricks dataset, bitmap strategy
   - `node scripts/main.js stats --dataset moons --encType rlp` - Moons dataset, RLP strategy
   - `node scripts/main.js stats --dataset moons --encType native` - Moons dataset, native strategy
   - `node scripts/main.js stats --dataset moons --encType bitmap` - Moons dataset, bitmap strategy

6. **Tables**:
   - `node scripts/main.js tables --dataset bricks --type basic` - Bricks dataset, basic stats table
   - `node scripts/main.js tables --dataset bricks --encType rlp` - Bricks dataset, RLP strategy (comparison table)
   - `node scripts/main.js tables --dataset bricks --encType native` - Bricks dataset, native strategy (comparison table)
   - `node scripts/main.js tables --dataset bricks --encType bitmap` - Bricks dataset, bitmap strategy (comparison table)
   - `node scripts/main.js tables --dataset moons --type basic` - Moons dataset, basic stats table
   - `node scripts/main.js tables --dataset moons --encType rlp` - Moons dataset, RLP strategy (comparison table)
   - `node scripts/main.js tables --dataset moons --encType native` - Moons dataset, native strategy (comparison table)
   - `node scripts/main.js tables --dataset moons --encType bitmap` - Moons dataset, bitmap strategy (comparison table)
