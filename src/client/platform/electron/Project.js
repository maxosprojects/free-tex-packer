import APP from '../../APP';
import PackProperties from '../../ui/PackProperties.jsx';
import ImagesList from '../../ui/ImagesList.jsx';
import FileSystem from 'platform/FileSystem';
import Controller from 'platform/Controller';
import appInfo from '../../../../package.json';
import I18 from '../../utils/I18';
import {Observer, GLOBAL_EVENT} from "../../Observer";

const RECENT_PROJECTS_KEY = "recent-projects";

let CURRENT_PROJECT_PATH = "";
let CURRENT_PROJECT_MODIFIED = false;

class Project {
    static startObserv() {
        Project.stopObserv();
        
        Observer.on(GLOBAL_EVENT.IMAGES_LIST_CHANGED, Project.onProjectChanged);
        Observer.on(GLOBAL_EVENT.PACK_OPTIONS_CHANGED, Project.onProjectChanged);
        Observer.on(GLOBAL_EVENT.PACK_EXPORTER_CHANGED, Project.onProjectChanged);
    }
    
    static stopObserv() {
        Observer.off(GLOBAL_EVENT.IMAGES_LIST_CHANGED, Project.onProjectChanged);
        Observer.off(GLOBAL_EVENT.PACK_OPTIONS_CHANGED, Project.onProjectChanged);
        Observer.off(GLOBAL_EVENT.PACK_EXPORTER_CHANGED, Project.onProjectChanged);
    }
    
    static onProjectChanged() {
        Project.setProjectChanged(true);
    }
    
    static setProjectChanged(val) {
        CURRENT_PROJECT_MODIFIED = !!val;
        Controller.updateProjectModified(CURRENT_PROJECT_MODIFIED);
    }
    
    static getData() {
        let images = [];
        
        for(let img of APP.i.images) {
            let image = {
                name: img.name,
                path: img.path
            };
            images.push(image);
        }
        
        let packOptions = Object.assign({}, APP.i.packOptions);
        packOptions.packer = APP.i.packOptions.packer.type;
        packOptions.exporter = APP.i.packOptions.exporter.type;
        
        let meta = {
            version: appInfo.version
        };
        
        return {
            meta: meta,
            savePath: APP.i.packOptions.savePath || '',
            images: images,
            packOptions: packOptions
        }
    }
    
    static getRecentProjects() {
        let recentProjects = localStorage.getItem(RECENT_PROJECTS_KEY);
        if(recentProjects) {
            try {recentProjects = JSON.parse(recentProjects)}
            catch(e) {recentProjects = []}
        }
        else {
            recentProjects = [];
        }
        
        return recentProjects;
    }
    
    static updateRecentProjects(path) {
        let recentProjects = Project.getRecentProjects();

        let res = [];

        for(let i=0; i<recentProjects.length; i++) {
            if(recentProjects[i] !== path) res.push(recentProjects[i]);
        }

        if(path) res.unshift(path);

        if(res.length > 10) res = res.slice(0, 10);

        localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(res));
        
        Controller.updateRecentProjects();
    }
    
    static save() {
        Project.saveAs(CURRENT_PROJECT_PATH);
    }
    
    static saveAs(currProjPath) {
        let inMemoryImages = APP.i.images
            .filter(img => img.path === undefined)
            .map(img => img.name);

        if (inMemoryImages.length > 0) {
            Observer.emit(GLOBAL_EVENT.SHOW_MESSAGE, I18.f("IN_MEMORY_IMAGES_ERROR", inMemoryImages.join(', ')));
            return;
        }

        let path = FileSystem.saveProject(Project.getData(), currProjPath);
        if(path) {
            CURRENT_PROJECT_PATH = path;
            Project.setProjectChanged(false);
            Project.updateRecentProjects(path);
        }
    }
    
    static saveChanges(cb=null) {
        if(CURRENT_PROJECT_MODIFIED) {
            let buttons = {
                "yes": {caption: I18.f("YES"), callback: () => { Project.save(); if(cb) cb(); }},
                "no": {caption: I18.f("NO"), callback: () => { if(cb) cb(); }},
                "cancel": {caption: I18.f("CANCEL")}
            };

            Observer.emit(GLOBAL_EVENT.SHOW_MESSAGE, I18.f("SAVE_CHANGES_CONFIRM"), buttons);
        }
        else {
            if(cb) cb();
        }
    }
    
    static load(pathToLoad="") {
        Project.saveChanges(() => {
            let {path, data} = FileSystem.loadProject(pathToLoad);

            if(data) {
                Project.stopObserv();

                FileSystem.terminateWatch();

                Project.updateRecentProjects(path);

                PackProperties.i.setOptions(data.packOptions);

                let images;

                FileSystem.loadImages(data.images, res => {
                    images = res;
                    ImagesList.i.setImages(res);
                    Project.startObserv();
                });

                CURRENT_PROJECT_PATH = path;
                Project.setProjectChanged(false);
            }
        });
    }

    static create() {
        Project.saveChanges(() => {
            FileSystem.terminateWatch();
            
            PackProperties.i.setOptions(PackProperties.i.loadOptions());
            ImagesList.i.setImages({});
            CURRENT_PROJECT_PATH = "";
            Project.setProjectChanged(false);

            Controller.updateProject();
        });
    }
}

export default Project;