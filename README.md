### Reddit community points simulations/experiments repository

Repository accompanying the rollup diff compression research, using the Reddit's airdrop as a usecase.

You can read more about the research [here](https://medium.com/privacy-scaling-explorations/rollup-diff-compression-application-level-compression-strategies-to-reduce-the-l2-data-footprint-d14291acc825).

Datasets used in this experiment:

Dataset names: `bricks` (`r/FortNiteBR`), `moons` (`r/CryptoCurrencies`). You can find the data in `data/raw` directory.


#### Install instructions:
```
yarn install
```

#### Usage guide:

The repository is setup to be used by running commands from the command line. I'm using the `yargs` package 
for parsing command line arguments and executing the appropriate scripts.

The experiment is separated in multiple stages, commands for each stage are given below:

1. **Convert data**: 
   - `node scripts/main.js convert --dataset bricks` - Bricks dataset
   - `node scripts/main.js convert --dataset moons` - Moons dataset
    
2. **Group data**:
   - `node scripts/main.js group --dataset bricks --encType rlp` - Bricks dataset, RLP strategy
   - `node scripts/main.js group --dataset bricks --encType native` - Bricks dataset, native strategy
   - `node scripts/main.js group --dataset bricks --encType bitmap` - Bricks dataset, bitmap strategy
   - `node scripts/main.js group --dataset bricks --encType bitmapCluster` - Bricks dataset, bitmapCluster strategy
   - `node scripts/main.js group --dataset moons --encType rlp` - Moons dataset, RLP strategy
   - `node scripts/main.js group --dataset moons --encType native` - Moons dataset, native strategy
   - `node scripts/main.js group --dataset moons --encType bitmap` - Moons dataset, bitmap strategy
   - `node scripts/main.js group --dataset moons --encType bitmapCluster` - Moons dataset, bitmapCluster strategy

3. **Encode data**:
   - `node scripts/main.js encode --dataset bricks --encType rlp` - Bricks dataset, RLP strategy
   - `node scripts/main.js encode --dataset bricks --encType native` - Bricks dataset, native strategy
   - `node scripts/main.js encode --dataset bricks --encType bitmap` - Bricks dataset, bitmap strategy
   - `node scripts/main.js encode --dataset bricks --encType bitmapCluster` - Bricks dataset, bitmapCluster strategy
   - `node scripts/main.js encode --dataset moons --encType rlp` - Moons dataset, RLP strategy
   - `node scripts/main.js encode --dataset moons --encType native` - Moons dataset, native strategy
   - `node scripts/main.js encode --dataset moons --encType bitmap` - Moons dataset, bitmap strategy
   - `node scripts/main.js encode --dataset moons --encType bitmapCluster` - Moons dataset, bitmapCluster strategy

4. **Calculate stats**:
   - `node scripts/main.js stats --dataset bricks --encType rlp` - Bricks dataset, RLP strategy
   - `node scripts/main.js stats --dataset bricks --encType native` - Bricks dataset, native strategy
   - `node scripts/main.js stats --dataset bricks --encType bitmap` - Bricks dataset, bitmap strategy
   - `node scripts/main.js stats --dataset bricks --encType bitmapCluster` - Bricks dataset, bitmapCluster strategy
   - `node scripts/main.js stats --dataset moons --encType rlp` - Moons dataset, RLP strategy
   - `node scripts/main.js stats --dataset moons --encType native` - Moons dataset, native strategy
   - `node scripts/main.js stats --dataset moons --encType bitmap` - Moons dataset, bitmap strategy
   - `node scripts/main.js stats --dataset moons --encType bitmapCluster` - Moons dataset, bitmapCluster strategy

5. **Create tables**:
   - `node scripts/main.js makeTable --dataset bricks --encType rlp --type comparison` - Bricks dataset, RLP strategy, Comparison table
   - `node scripts/main.js makeTable --dataset bricks --encType rlp --type naive` - Bricks dataset, RLP strategy, Naive stats table
   - `node scripts/main.js makeTable --dataset bricks --encType native` - Bricks dataset, native strategy
   - `node scripts/main.js makeTable --dataset bricks --encType bitmap` - Bricks dataset, bitmap strategy
   - `node scripts/main.js makeTable --dataset bricks --encType bitmapCluster` - Bricks dataset, bitmapCluster strategy
   - `node scripts/main.js makeTable --dataset moons --encType rlp` - Moons dataset, RLP strategy
   - `node scripts/main.js makeTable --dataset moons --encType native` - Moons dataset, native strategy
   - `node scripts/main.js makeTable --dataset moons --encType bitmap` - Moons dataset, bitmap strategy
   - `node scripts/main.js makeTable --dataset moons --encType bitmapCluster` - Moons dataset, bitmapCluster strategy