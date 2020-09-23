import Packer from "./Packer";
import Rect from "../math/Rect";

const METHOD = {
    'Sorted by name': "Sorted by name"
};

class LinePerDir extends Packer {

    constructor() {
        super();
    }

    pack(data, method) {
        let arrCopy = data.slice();
        sort(arrCopy);
        return arrange(arrCopy);
    }

    static get type() {
        return "Line per directory";
    }

    static get methods() {
        return METHOD;
    }

    static getMethodProps() {
        return {name: "Sorted by name", description: "Sorted by name"};
    }
}

function arrange(data) {
    let x = 0;
    let y = 0;
    let maxLineHeight = 0;
    let folder = '';
    for (let item of data) {
        let nextFolder = getFolder(item.name);
        if (folder !== nextFolder) {
            folder = nextFolder;
            x = 0;
            y += maxLineHeight;
            maxLineHeight = item.frame.h;
        }
        if (maxLineHeight < item.frame.h) {
            maxLineHeight = item.frame.h;
        }
        item.frame.x = x;
        item.frame.y = y;
        x += item.frame.w;
    }
    return data;
}

function getFolder(filename) {
    let parts = filename.split('/');
    parts.pop();
    return parts.pop();
}

function sort(arr) {
    arr.sort((a, b) => {
        let nameA = a.name.toLowerCase();
        let nameB = b.name.toLowerCase();
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }
        return 0;
    });
}

export default LinePerDir;
