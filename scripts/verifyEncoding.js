const { readData } = require('./utils');

const compareData = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}


const verifyData = (argv) => {
    // Verify encoded data by comparing grouped and decoded data (pre and post encoding)
    const dataset = argv.dataset;
    const encType = argv.encType;

    console.log(`[${dataset}] Verifying encoded data, enc type: [${encType}]...`);
    const groupedData = readData(dataset, 'grouped', encType);
    const decodedData = readData(dataset, 'decoded', encType);

    const res = compareData(groupedData, decodedData);
    if (res) {
        console.log(`[${dataset}] Data verified successfully! Enc type: [${encType}]...`);
    } else {
        console.error(`[${dataset}] Verification failed, grouped and decoded data not equal! Enc type: [${encType}]...`)
    }

}

module.exports = {
    verifyData
}