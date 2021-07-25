const yargs = require('yargs');
const { computeStats } = require('./computeStats')
const { generalStats } = require('./generalStats')
const { groupData } = require('./groupData')
const { groupDataChunked } = require('./groupDataChunked')
const { convertData } = require('./convertData')
const { encodeData } = require('./encodeData')
const { encodeDataChunked } = require('./encodeDataChunked')
const { decodeData } = require('./decodeData')
const { verifyData } = require('./verifyEncoding')
const { groupReferencingStats } = require('./groupReferencingStats')
const { makeTable } = require('./makeTables')

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
    .command('group', 'Group data')
    .command('groupChunked', 'Group data chunked', {
        maxItems: {
            alias: 'maxItems',
            description: 'Max items per chounk',
            type: 'number',
            default: 50
        }
    })
    .command('encode', 'Encode the data')
    .command('encodeChunked', 'Encode the data chunked')
    .command('decode', 'Decode the data')
    .command('verify', 'Verify if the data is properly encoded')
    .command('stats', 'Make general stats for dataset and encType')
    .command('referencingStats', 'Make referencingStats for dataset')
    .command('tables', 'Make markdown table from stats data, based on the `type` param', {
        type: {
            description: 'The type of table to make',
            alias: 'type',
            type: 'string',
            choices: ['comparison', 'basic'],
            default: 'comparison'
        }
    })
    .option('encType', {
        alias: 'e',
        description: 'the number encoding type',
        type: 'string',
        choices: ['rlp', 'native', 'bitmap', 'bitmapCluster'],
        default: 'rlp'
    })
    .option('dataset', {
        alias: 'd',
        description: 'the dataset to operate on',
        type: 'string',
        choices: ['bricks', 'moons'],
        default: 'bricks'
    })
    .option('rounds', {
        alias: 'r',
        description: 'number of distribution rounds to perform the operation on',
        type: 'number',
        default: 0
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
} else if (argv._.includes('groupChunked')) {
    groupDataChunked(argv)
} else if (argv._.includes('encode')) {
    encodeData(argv)
} else if (argv._.includes('encodeChunked')) {
    encodeDataChunked(argv)
} else if (argv._.includes('decode')) {
    decodeData(argv)
} else if (argv._.includes('verify')) {
    verifyData(argv)
} else if (argv._.includes('referencingStats')) {
    groupReferencingStats(argv)
} else if (argv._.includes('stats')) {
    generalStats(argv)
} else if (argv._.includes('tables')) {
    makeTable(argv)
} else {
    console.error("Please enter valid command.")
}