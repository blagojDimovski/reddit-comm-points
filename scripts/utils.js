const fs = require("fs");

const getFileNames = (readDirPath) => {
    let files = fs.readdirSync(readDirPath);
    return files.sort((a, b) => {
        let aSplit = a.split("_");
        let bSplit = b.split("_");
        aRound = parseInt(aSplit[1]);
        bRound = parseInt(bSplit[1]);
        return aRound - bRound;
    });
};

module.exports = {
    getFileNames
}