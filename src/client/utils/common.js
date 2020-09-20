function smartSortImages(f1, f2) {
    let t1 = f1.split('/');
    let t2 = f2.split('/');

    let n1 = t1.pop();
    let n2 = t2.pop();

    let p1 = t1.join('/');
    let p2 = t2.join('/');

    if(p1 === p2) {
        t1 = n1.split('.');
        t2 = n2.split('.');

        if(t1.length > 1) t1.pop();
        if(t2.length > 1) t2.pop();

        n1 = parseInt(t1.join('.'));
        n2 = parseInt(t2.join('.'));

        if(!isNaN(n1) && !isNaN(n2)) {
            if(n1 === n2) return 0;
            return n1 > n2 ? 1 : -1;
        }
    }

    if(f1 === f2) return 0;
    return f1 > f2 ? 1 : -1;
}

function findIndexByImgName(imageList, name) {
    return imageList.findIndex(img => img.name === name);
}

function findImageByName(imageList, name) {
    let index = findIndexByImgName(imageList, name);
    return index > -1 ? imageList[index] : null;
}

function addImageToList(imageList, img) {
    let index = findIndexByImgName(imageList, img.name);
    if (index > -1) {
        imageList[index] = img;
    } else {
        imageList.push(img);
    }
}

function addImagesToList(imageList, anotherListOfImages) {
    for (let img of anotherListOfImages) {
        addImageToList(imageList, img);
    }
}

module.exports = {
    smartSortImages,
    findIndexByImgName,
    findImageByName,
    addImageToList,
    addImagesToList
};