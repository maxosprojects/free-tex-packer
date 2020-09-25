import Grid from '../../splitters/Grid';
import JsonHash from '../../splitters/JsonHash';
import JsonArray from '../../splitters/JsonArray';
import { formatEnumeration } from '../../utils/common';

const SUPPORTED_SPLITTERS = [
    Grid,
    JsonHash,
    JsonArray
];

function isSplitterSupported(splitter) {
    return SUPPORTED_SPLITTERS.some(clazz => splitter.type === clazz.type);
}

function getSupportedSplitters() {
    let splitterNames = SUPPORTED_SPLITTERS.map(splitter => splitter.type);
    return formatEnumeration(splitterNames);
}

export {
    isSplitterSupported,
    getSupportedSplitters
};
