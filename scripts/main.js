const yargs = require('yargs');
const { computeStats } = require('./makeStats')
const { groupData } = require('./groupData')
const { convertData } = require('./convertData')
const { encodeData } = require('./encodeData')
const { decodeData } = require('./decodeData')

const argv = yargs
    .command('compute', 'Compute stats', {
        dataset: {
            description: 'the dataset to check for',
            alias: 'd',
            type: 'string',
            default: 'bricks'
        },
        naive: {
            description: 'calculate naive gas costs',
            alias: 'n',
            type: 'boolean',
            default: true
        },
        compressed: {
            description: 'calculate compressed gas costs',
            alias: 'cmp',
            type: 'boolean',
            default: true
        },
        compressedMasks: {
            description: 'calculate compressed bitmask gas costs',
            alias: 'cmpb',
            type: 'boolean',
            default: true
        },
        cache: {
            alias: 'c',
            description: 'use cached results',
            type: 'boolean',
            default: false
        }
    })
    .command('convert', 'Convert raw csv data into json')
    .command('group', 'Group data', {
        chunk: {
            description: 'chunk the groups into chunks of approximately equal size',
            alias: 'chunk',
            type: 'boolean',
            default: false
        }
    })
    .command('chunk', 'Chunk the parsed data into groups', {
        bytesPerChunk: {
            description: 'chunk the data into groups, where each group is of max bytesPerChunk bytes',
            alias: 'bytes',
            type: 'number',
            default: 20000
        }
    })
    .command('encode', 'Encode the data')
    .command('decode', 'Decode the data')
    .command('batchMint', 'Batch mint subreddit points', {
        round: {
            description: 'the round to be batch minted',
            alias: 'r',
            type: 'number',
            default: 1
        }
    })
    .option('encType', {
        alias: 'encType',
        description: 'the number encoding type',
        type: 'string',
        choices: ['rlp', 'native'],
        default: 'rlp'
    })
    .option('dataset', {
        alias: 'd',
        description: 'the dataset to operate on',
        type: 'string',
        choices: ['bricks', 'moons'],
        default: 'bricks'
    })
    .help()
    .alias('help', 'h')
    .argv;


if (argv._.includes('convert')) {
    convertData(argv);
} else if (argv._.includes('compute')) {
    computeStats(argv);
} else if (argv._.includes('group')) {
    groupData(argv)
} else if (argv._.includes('encode')) {
    encodeData(argv)
} else if (argv._.includes('decode')) {
    decodeData(argv)
}