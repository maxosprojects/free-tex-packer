import React from 'react';
import ReactDOM from 'react-dom';

import LocalImagesLoader from '../utils/LocalImagesLoader';
import ZipLoader from '../utils/ZipLoader';
import I18 from '../utils/I18';

import {Observer, GLOBAL_EVENT} from '../Observer';
import ImagesTree from './ImagesTree.jsx';

import FileSystem from 'platform/FileSystem';

import {smartSortImages, addImagesToList, findImageByName, findIndexByImgName} from '../utils/common';

let INSTANCE = null;

class ImagesList extends React.Component {
    constructor(props) {
        super(props);

        INSTANCE = this;
        
        this.addImages = this.addImages.bind(this);
        this.addZip = this.addZip.bind(this);
        this.addImagesFs = this.addImagesFs.bind(this);
        this.addFolderFs = this.addFolderFs.bind(this);
        this.loadImagesComplete = this.loadImagesComplete.bind(this);
        this.clear = this.clear.bind(this);
        this.deleteSelectedImages = this.deleteSelectedImages.bind(this);
        this.doClear = this.doClear.bind(this);
        this.onFilesDrop = this.onFilesDrop.bind(this);
        this.handleImageItemSelected = this.handleImageItemSelected.bind(this);
        this.handleImageClearSelection = this.handleImageClearSelection.bind(this);
        this.imagesImported = this.imagesImported.bind(this);
        this.handleImageNameChange = this.handleImageNameChange.bind(this);
        this.getSelectedImageName = this.getSelectedImageName.bind(this);
        this.getSelectedImage = this.getSelectedImage.bind(this);
        this.renderImageNameEditSection = this.renderImageNameEditSection.bind(this);
        this.onSelectionChanged = this.onSelectionChanged.bind(this);
        this.onListChanged = this.onListChanged.bind(this);
        
        Observer.on(GLOBAL_EVENT.IMAGE_ITEM_SELECTED, this.handleImageItemSelected, this);
        Observer.on(GLOBAL_EVENT.IMAGE_CLEAR_SELECTION, this.handleImageClearSelection, this);
        Observer.on(GLOBAL_EVENT.FS_CHANGES, this.handleFsChanges, this);
        Observer.on(GLOBAL_EVENT.IMAGES_IMPORTED, this.imagesImported, this);
        Observer.on(GLOBAL_EVENT.IMAGES_LIST_SELECTED_CHANGED, this.onSelectionChanged, this);
        Observer.on(GLOBAL_EVENT.IMAGES_LIST_CHANGED, this.onListChanged, this);
		
		this.handleKeys = this.handleKeys.bind(this);
		
		window.addEventListener("keydown", this.handleKeys, false);

        this.state = {
            images: [],
            editedImageName: null
        };
    }
    
    static get i() {
        return INSTANCE;
    }

    componentWillUnmount() {
        Observer.off(GLOBAL_EVENT.IMAGE_ITEM_SELECTED, this.handleImageItemSelected, this);
        Observer.off(GLOBAL_EVENT.IMAGE_CLEAR_SELECTION, this.handleImageClearSelection, this);
        Observer.off(GLOBAL_EVENT.FS_CHANGES, this.handleFsChanges, this);
        Observer.off(GLOBAL_EVENT.IMAGES_IMPORTED, this.imagesImported, this);
        Observer.off(GLOBAL_EVENT.IMAGES_LIST_SELECTED_CHANGED, this.onSelectionChanged, this);
        Observer.off(GLOBAL_EVENT.IMAGES_LIST_CHANGED, this.onListChanged, this);
		
		window.removeEventListener("keydown", this.handleKeys, false);
    }

    onSelectionChanged(selected) {
        this.setState({
            editedImageName: selected.length === 0 || selected.length > 1 ? null : selected[0]
        });
    }

    onListChanged(images) {
        this.setState({
            editedImageName: this.getSelectedImageName(images)
        });
    }

	handleKeys(e) {
		if(e) {
            let key = e.keyCode || e.which;
            if(key === 65 && e.ctrlKey) this.selectAllImages();
        }
	}
    
    componentDidMount() {
        let dropZone = ReactDOM.findDOMNode(this.refs.imagesTree);
        if(dropZone) {
            dropZone.ondrop = this.onFilesDrop;

            dropZone.ondragover = () => {
                let help = ReactDOM.findDOMNode(this.refs.dropHelp);
                if(help) help.className = "image-drop-help selected";
                return false;
            };

            dropZone.ondragleave = () => {
                let help = ReactDOM.findDOMNode(this.refs.dropHelp);
                if(help) help.className = "image-drop-help";
                return false;
            };
        }
    }
    
    setImages(images) {
        this.setState({images: images});
        Observer.emit(GLOBAL_EVENT.IMAGES_LIST_CHANGED, images);
    }
    
    onFilesDrop(e) {
        e.preventDefault();
        
        if(e.dataTransfer.files.length) {
            let loader = new LocalImagesLoader();
            loader.load(e.dataTransfer.files, null, data => this.loadImagesComplete(data));
        }
        
        return false;
    }

    addImages(e) {
        if(e.target.files.length) {
            Observer.emit(GLOBAL_EVENT.SHOW_SHADER);

            let loader = new LocalImagesLoader();
            loader.load(e.target.files, null, data => this.loadImagesComplete(data));
        }
    }
    
    addZip(e) {
        let file = e.target.files[0];
        if(file) {
            Observer.emit(GLOBAL_EVENT.SHOW_SHADER);

            let loader = new ZipLoader();
            loader.load(file, null, data => this.loadImagesComplete(data));
        }
    }
    
    addImagesFs() {
        Observer.emit(GLOBAL_EVENT.SHOW_SHADER);
        FileSystem.addImages(this.loadImagesComplete);
    }

    addFolderFs() {
        Observer.emit(GLOBAL_EVENT.SHOW_SHADER);
        FileSystem.addFolder(this.loadImagesComplete);
    }

    handleFsChanges(data) {
        let image = null;
        let images = this.state.images;
        let imageKey = "";
        
        let keys = Object.keys(images);
        for(let key of keys) {
            let item = images[key];
            if(item.fsPath.path === data.path) {
                image = item;
                imageKey = key;
                break;
            }
        }
        
        if(data.event === "unlink" && image) {
            delete images[imageKey];
            this.setState({images: images});
            Observer.emit(GLOBAL_EVENT.IMAGES_LIST_CHANGED, images);
        }

        if(data.event === "add" || data.event === "change") {
            let folder = "";
            let addPath = "";
            
            for(let key of keys) {
                let item = images[key];
                
                if(item.fsPath.folder && data.path.substr(0, item.fsPath.folder.length) === item.fsPath.folder) {
                    folder = item.fsPath.folder;
                    addPath = folder.split("/").pop();
                }
            }
            
            let name = "";
            if(folder) {
                name = addPath + data.path.substr(folder.length);
            }
            else {
                name = data.path.split("/").pop();
            }
            
            FileSystem.loadImages([{name: name, path: data.path, folder: folder}], this.loadImagesComplete);
        }
    }
    
    loadImagesComplete(list=[]) {

        Observer.emit(GLOBAL_EVENT.HIDE_SHADER);
        
        if(PLATFORM === "web") {
            ReactDOM.findDOMNode(this.refs.addImagesInput).value = "";
            ReactDOM.findDOMNode(this.refs.addZipInput).value = "";
        }
        
        if(list.length) {
            let images = this.state.images;
            
            addImagesToList(images, list);

            // images = this.sortImages(images);

            this.setState({images: images});
            Observer.emit(GLOBAL_EVENT.IMAGES_LIST_CHANGED, images);
        }
    }

    imagesImported(images) {
        this.setState({
            images: {}
        }, this.loadImagesComplete.bind(this, images));
    }
    
    sortImages(images) {
        let names = Object.keys(images);
        names.sort(smartSortImages);

        let sorted = {};
        
        for(let name of names) {
            sorted[name] = images[name];
        }
        
        return sorted;
    }

    clear() {
        if(this.state.images.length) {
            let buttons = {
                "yes": {caption: I18.f("YES"), callback: this.doClear},
                "no": {caption: I18.f("NO")}
            };
            
            Observer.emit(GLOBAL_EVENT.SHOW_MESSAGE, I18.f("CLEAR_WARNING"), buttons);
        }
    }
    
    doClear() {
        Observer.emit(GLOBAL_EVENT.IMAGES_LIST_CHANGED, []);
        Observer.emit(GLOBAL_EVENT.IMAGES_LIST_SELECTED_CHANGED, []);
        this.setState({images: []});
    }

    selectAllImages() {
        let images = this.state.images;
        for(let img of images) {
            img.selected = true;
        }

        this.setState({images: this.state.images});
        this.emitSelectedChanges();
    }
    
    removeImagesSelect() {
        let images = this.state.images;
        for(let img of images) {
            img.selected = false;
        }
    }
    
    getCurrentImage() {
        let images = this.state.images;
        for(let img of images) {
            if(img.current) return img;
        }
        
        return null;
    }
    
    getImageIx(image) {
        return this.state.images.indexOf(image);
    }
    
    bulkSelectImages(to) {
        let current = this.getCurrentImage();
        if(!current) {
            to.selected = true;
            return;
        }
        
        let fromIx = this.getImageIx(current);
        let toIx = this.getImageIx(to);

        let images = this.state.images;
        let ix = 0;
        for(let img of images) {
            if(fromIx < toIx && ix >= fromIx && ix <= toIx) img.selected = true;
            if(fromIx > toIx && ix <= fromIx && ix >= toIx) img.selected = true;
            ix++;
        }
    }
    
    selectImagesFolder(path, selected) {
        let images = this.state.images;
        
        let first = false;
        for(let img of images) {
            if(img.name.substr(0, path.length + 1) === path + "/") {
                if(!first) {
                    first = true;
                    this.clearCurrentImage();
                    img.current = true;
                }
                img.selected = selected;
            }
        }
    }
    
    clearCurrentImage() {
        let images = this.state.images;
        for(let img of images) {
            img.current = false;
        }
    }
    
    getFirstImageInFolder(path) {
        let images = this.state.images;

        for(let img of images) {
            if (img.name.substr(0, path.length + 1) === path + "/") return img;
        }
        
        return null;
    }

    getLastImageInFolder(path) {
        let images = this.state.images;
        
        let ret = null;
        for(let img of images) {
            if (img.name.substr(0, path.length + 1) === path + "/") ret = images[key];
        }

        return ret;
    }
    
    handleImageItemSelected(e) {
        let path = e.path;
        let images = this.state.images;

        if(e.isFolder) {
            if(e.ctrlKey) {
                this.selectImagesFolder(path, true);
            }
            else if(e.shiftKey) {
                let to = this.getLastImageInFolder(path);
                if(to) this.bulkSelectImages(to);
                
                to = this.getFirstImageInFolder(path);
                if(to) {
                    this.bulkSelectImages(to);
                    this.clearCurrentImage();
                    to.current = true;
                }
            }
            else {
                this.removeImagesSelect();
                this.selectImagesFolder(path, true);
            }
        }
        else {
            let image = findImageByName(images, path);
            if(image) {
                if(e.ctrlKey) {
                    image.selected = !image.selected;
                }
                else if(e.shiftKey) {
                    this.bulkSelectImages(image);
                }
                else {
                    this.removeImagesSelect();
                    image.selected = true;
                }

                this.clearCurrentImage();
                image.current = true;
            }
        }

        this.setState({images: images});
        
        this.emitSelectedChanges();
    }

    handleImageClearSelection() {
        this.removeImagesSelect();
        this.clearCurrentImage();
        this.setState({images: this.state.images});
        this.emitSelectedChanges();
    }
    
    emitSelectedChanges() {
        let selected = [];

        let images = this.state.images;
        
        for(let img of images) {
            if(img.selected) selected.push(img.name);
        }

        Observer.emit(GLOBAL_EVENT.IMAGES_LIST_SELECTED_CHANGED, selected);
    }
    
    createImagesFolder(name="", path="") {
        return {
            isFolder: true,
            selected: false,
            name: name,
            path: path,
            items: []
        };
    }

    getImageSubFolder(root, parts) {
        parts = parts.slice();

        let folder = null;

        while(parts.length) {
            let name = parts.shift();

            folder = null;

            for (let item of root.items) {
                if (item.isFolder && item.name === name) {
                    folder = item;
                    break;
                }
            }

            if (!folder) {
                let p = [];
                if(root.path) p.unshift(root.path);
                p.push(name);
                
                folder = this.createImagesFolder(name, p.join("/"));
                root.items.push(folder);
            }

            root = folder;
        }

        return folder || root;
    }

    getImagesTree() {
        let res = this.createImagesFolder();

        for(let img of this.state.images) {
            let parts = img.name.split("/");
            let name = parts.pop();
            let folder = this.getImageSubFolder(res, parts);

            folder.items.push({
                img,
                path: img.name,
                name
            });
            
            if(img.selected) folder.selected = true;
        }

        return res;
    }

    deleteSelectedImages() {
        let images = this.state.images.slice();
        
        let deletedCount = 0;
        
        for(let img of this.state.images) {
            if(img.selected) {
                deletedCount++;
                let index = findIndexByImgName(images, img.name);
                images.splice(index, 1);
            }
        }
        
        if(deletedCount > 0) {
            // images = this.sortImages(images);

            this.setState({images});
            Observer.emit(GLOBAL_EVENT.IMAGES_LIST_CHANGED, images);
        }
    }

    renderWebButtons() {
        return (
            <span>
                <div className="btn back-800 border-color-gray color-white file-upload" title={I18.f("ADD_IMAGES_TITLE")}>
                    {I18.f("ADD_IMAGES")}
                    <input type="file" ref="addImagesInput" multiple accept="image/png,image/jpg,image/jpeg,image/gif" onChange={this.addImages} />
                </div>
    
                <div className="btn back-800 border-color-gray color-white file-upload" title={I18.f("ADD_ZIP_TITLE")}>
                    {I18.f("ADD_ZIP")}
                    <input type="file" ref="addZipInput" accept=".zip,application/octet-stream,application/zip,application/x-zip,application/x-zip-compressed" onChange={this.addZip} />
                </div>
            </span>
        );
    }
    
    renderElectronButtons() {
        return (
            <span>
                <div className="btn back-800 border-color-gray color-white" onClick={this.addImagesFs} title={I18.f("ADD_IMAGES_TITLE")}>
                    {I18.f("ADD_IMAGES")}
                </div>
    
                <div className="btn back-800 border-color-gray color-white" onClick={this.addFolderFs} title={I18.f("ADD_FOLDER_TITLE")}>
                    {I18.f("ADD_FOLDER")}
                </div>
            </span>
        );
    }

    handleImageNameChange(event) {
        let newName = event.target.value;
        this.setState({editedImageName: newName});
        if (newName === '') {
            return;
        }
        let image = this.getSelectedImage();
        image.name = newName;
        this.setState({
            images: this.state.images
        });
    }

    getSelectedImage(images = this.state.images) {
        let selected = images.filter(img => !!img.selected);
        if (selected.length === 0 || selected.length > 1) {
            return null;
        }
        return selected[0];
    }

    getSelectedImageName(images = this.state.images) {
        let selected = this.getSelectedImage(images);
        if (selected === null) {
            return null;
        }
        return selected === null ? selected.name : null;
    }

    renderImageNameEditSection() {
        if (this.state.editedImageName === null) {
            return null;
        }
        return (
            <span>
                <span>{I18.f("EDIT_IMAGE_FRAME_NAME")}</span>
                <br/>
                <input type="text" value={this.state.editedImageName} onChange={this.handleImageNameChange}/>
            </span>
        );
    }
    
    render() {
        let data = this.getImagesTree(this.state.images);
        
        let dropHelp = this.state.images.length > 0 ? null : (<div ref="dropHelp" className="image-drop-help">{I18.f("IMAGE_DROP_HELP")}</div>);

        return (
            <div className="images-list border-color-gray back-white">
                
                <div className="images-controllers border-color-gray">
                    
                    {
                        PLATFORM === "web" ? (this.renderWebButtons()) : (this.renderElectronButtons())
                    }

                    <div className="btn back-800 border-color-gray color-white" onClick={this.deleteSelectedImages} title={I18.f("DELETE_TITLE")}>
                        {I18.f("DELETE")}
                    </div>
                    <div className="btn back-800 border-color-gray color-white" onClick={this.clear} title={I18.f("CLEAR_TITLE")}>
                        {I18.f("CLEAR")}
                    </div>
                    
                    <hr/>

                </div>
                
                <div ref="imagesTree" className="images-tree">
                    <ImagesTree data={data} />
                    {dropHelp}
                </div>

                <div ref="imageNameEditor" className="image-name-editor">
                    {this.renderImageNameEditSection()}
                </div>

            </div>
        );
    }
}

export default ImagesList;