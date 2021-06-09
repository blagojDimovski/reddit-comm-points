
const ADDR_BYTES = 20;
const RLP_SINGLE_DIGIT_BYTES = 1;
const SMALL_BYTES = 1;
const MED_BYTES = 2;
const RLP_MULTI_DIGIT_BYTES = 3;
const BATCH_TYPE_BYTES = 1;
const BITMASK_BYTES = 13;
const GAS_COST_BYTE = 16;


const dataDirs = {
    raw: 'data/raw',
    encoded: 'data/encoded',
    decoded: 'data/decoded',
    grouped: 'data/grouped',
    stats: 'data/stats',
    json: 'data/json',
    addrIndex: 'data/addrIndex'
}

module.exports = {
    dataDirs,
    ADDR_BYTES,
    RLP_SINGLE_DIGIT_BYTES,
    RLP_MULTI_DIGIT_BYTES,
    BATCH_TYPE_BYTES,
    BITMASK_BYTES,
    SMALL_BYTES,
    MED_BYTES,
    GAS_COST_BYTE
}