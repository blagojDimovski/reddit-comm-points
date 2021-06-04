/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {  ethers } = require("hardhat");
const {getFileNames} = require('./utils')
const FastIntegerCompression = require("fastintcompression");
const TypedFastBitSet = require("typedfastbitset");


const main = async () => {
    console.log("Making group stats...");

    let sortedRepeatingGroups = JSON.parse(fs.readFileSync("reddit-data-stats/bricks/groups/sortedRepeatingGroups.json", "utf-8"));
    let groupItems = sortedRepeatingGroups["0"]["items"];
    let groupUncompressed = Buffer.from(groupItems);
    let groupUncompressedSizeBytes = Buffer.byteLength(groupUncompressed);

    let groupCompressed = FastIntegerCompression.compress(groupItems);
    let groupCompressedSizeBytesLib = FastIntegerCompression.computeCompressedSizeInBytes(groupItems);
    let groupCompressedSizeBytes = Buffer.byteLength(groupCompressed)


    console.log(`Stats: Num items: ${groupItems.length}, Uncompressed size: ${groupUncompressedSizeBytes}, Compressed size fastbit: ${groupCompressedSizeBytesLib}, Compressed size buffer: ${groupCompressedSizeBytes}`)


    let typedBitSet = new TypedFastBitSet(groupItems);
    let typedBitSetBeforeTrim = typedBitSet.size();
    typedBitSet.trim();
    let typedBitSetAfterTrim = typedBitSet.size();
    let typedBitSetStr = typedBitSet.toString();
    console.log(`Typed fast bitset stats: Before trim: ${typedBitSetBeforeTrim}, After trim: ${typedBitSetAfterTrim}.`)
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
