import MaxRectsPacker from "./MaxRectsPacker";
import MaxRectsBin from "./MaxRectsBin";
import OptimalPacker from "./OptimalPacker";
import LinePerDir from './LinePerDir.js';

const list = [
    MaxRectsBin,
    MaxRectsPacker,
    OptimalPacker,
    LinePerDir
];

function getPackerByType(type) {
    for(let item of list) {
        if(item.type === type) {
            return item;
        }
    }
    return null;
}

export { getPackerByType };
export default list;
