import {addImageToList} from './common.js';

class Base64ImagesLoader {
    constructor() {
        this.loaded = [];

        this.onProgress = null;
        this.onEnd = null;

        this.waitImages = this.waitImages.bind(this);
    }

    load(data, onProgress=null, onEnd=null) {
        this.data = data.slice();
        
        this.onProgress = onProgress;
        this.onEnd = onEnd;
        
        for(let item of data) {
            let img = new Image();
            img.src = item.url;
            img._base64 = item.url;
            img.path = item.path;
            img.name = item.name;
            img.ext = item.ext;
            if (item.frame !== undefined) {
                img.frame = item.frame;
            }

            addImageToList(this.loaded, img);
        }
        
        this.waitImages();
    }

    waitImages() {
        let ready = true;
        let loaded = 0;
        
        for(let img of this.loaded) {
            if(!img.complete) {
                ready = false;
            }
            else {
                loaded++;
            }
        }

        if(ready) {
            if(this.onEnd) this.onEnd(this.loaded);
        }
        else {
            if(this.onProgress) this.onProgress(loaded / this.loaded.length);
            setTimeout(this.waitImages, 50);
        }
    }
}

export default Base64ImagesLoader;