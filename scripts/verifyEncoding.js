const { readData } = require('./utils');

const compareData = (obj1, obj2) => {

    let equal = true;
    let fNamesEqual = [];
    let fNameNotEqual = '';
    let keyNotEqual = '';
    for(let fName in obj1) {

        let obj1data = obj1[fName];
        let obj2data = obj2[fName]

        equal = Object.keys(obj1data).length === Object.keys(obj2data).length
        if(!equal) {
            fNameNotEqual = fName;
            break;
        }

        for (let key in obj1data) {
            let obj1group = obj1data[key];
            let obj2group = obj2data[key];

            equal = JSON.stringify(obj1group) === JSON.stringify(obj2group);
            if(!equal) {
                fNameNotEqual = fName;
                keyNotEqual = key;
                break;
            }

        }
        if(!equal) break;
        fNamesEqual.push(fName);
    }

    return {
        equal,
        fNamesEqual,
        fNameNotEqual,
        keyNotEqual
    };

}


const verifyData = (argv) => {
    // Verify encoded data by comparing grouped and decoded data (pre and post encoding)
    const dataset = argv.dataset;
    const encType = argv.encType;

    console.log(`[${dataset}][${encType}] Verifying encoded data...`);
    const groupedData = readData(dataset, 'grouped', encType);
    const decodedData = readData(dataset, 'decoded', encType);

    const res = compareData(groupedData, decodedData);
    if (res.equal) {
        console.log(`[${dataset}][${encType}] Data verified successfully!`);
    } else {
        console.error(`[${dataset}][${encType}] Verification failed, grouped and decoded data not equal!`)
        console.error(`[${dataset}][${encType}] Equal file names: ${res.fNamesEqual}`)
        console.error(`[${dataset}][${encType}] Not equal file name: ${res.fNameNotEqual}`)
        console.error(`[${dataset}][${encType}] Not equal key: ${res.keyNotEqual}`)
    }

}

module.exports = {
    verifyData
}