class FrameCutter {
    
    constructor() {
        this.buffer = document.createElement("canvas");
        this.ctx = this.buffer.getContext('2d');

        this.cut = this.cut.bind(this);
    }

    cut(inputImage, frame, ext) {
        this.buffer.width = frame.width;
        this.buffer.height = frame.height;

        this.ctx.clearRect(0, 0, this.buffer.width, this.buffer.height);

        this.ctx.drawImage(inputImage,
            frame.x, frame.y,
            frame.width, frame.height,
            0, 0,
            frame.width, frame.height);

        let base64 = this.buffer.toDataURL(ext === 'png' ? 'image/png' : 'image/jpeg');
        base64 = base64.split(',').pop();
    
        let img = new Image();
        let base64Image = 'data:image/' + ext + ';base64,' + base64
        img.src = base64Image;
        img._base64 = base64Image;
        copyIfPresent(inputImage, img, 'name');
        copyIfPresent(inputImage, img, 'path');
        img.frame = frame;

        return img;
    }
}

function copyIfPresent(from, to, fieldName) {
    if (from[fieldName] !== undefined) {
        to[fieldName] = from[fieldName];
    }
}

export default FrameCutter;
