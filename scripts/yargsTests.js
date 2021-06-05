const yargs = require('yargs');

const argv = yargs
    .command('computeStats', 'Tells whether an year is leap year or not', {
        dataset: {
            description: 'the dataset to check for',
            alias: 'd',
            type: 'string',
            default: 'bricks'
        },
        naive: {
            description: 'the dataset to check for',
            alias: 'n',
            type: 'boolean',
            default: true
        },
        compressed: {
            description: 'the dataset to check for',
            alias: 'c',
            type: 'boolean',
            default: true
        },
        compressedMasks: {
            description: 'the dataset to check for',
            alias: 'cb',
            type: 'boolean',
            default: true
        },

    })
    .option('cache', {
        alias: 'c',
        description: 'use cached results',
        type: 'boolean',
        default: false
    })
    .help()
    .alias('help', 'h')
    .argv;

if (argv.time) {
    console.log('The current time is: ', new Date().toLocaleTimeString());
}

if (argv._.includes('lyr')) {
    const year = argv.year || new Date().getFullYear();
    if (((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0)) {
        console.log(`${year} is a Leap Year`);
    } else {
        console.log(`${year} is NOT a Leap Year`);
    }
}

console.log(argv);