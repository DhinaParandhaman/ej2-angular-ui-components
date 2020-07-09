import { QueryList, SimpleChanges, SimpleChange, EmbeddedViewRef } from '@angular/core';
import { getValue, setValue } from '@syncfusion/ej2-base';
import { clearTemplate, registerEvents } from './util';

/**
 * Complex Array Base module
 */

export interface IChildChange {
    index: number;
    change: Object;
}

interface Tag {
    hasChanges: boolean;
    getProperties: Function;
    isInitChanges: boolean;
    clearTemplate?: (args: string[]) => void;
}

export class ComplexBase<T> {
    public isUpdated: boolean;
    public hasChanges?: boolean = false;
    public index?: number;
    public propCollection?: { [key: string]: Object } = {};
    public dataSource?: { [key: string]: Object } = {};
    public property?: string;
    public tags?: string[] = [];
    private tagObjects?: { name: string, instance: Tag }[] = [];
    private registeredTemplate: { [key: string]: EmbeddedViewRef<Object>[] };
    // tslint:disable-next-line:no-any
    protected directivePropList: any;
    public ngOnInit(): void {
        this.registeredTemplate = {};
        for (let tag of this.tags) {
            let objInstance: Tag = getValue('child' + tag.substring(0, 1).toUpperCase() + tag.substring(1), this);
            if (objInstance) {
                this.tagObjects.push({ instance: objInstance, name: tag });
            }
        }
        let templateProperties: string[] = Object.keys(this);
        templateProperties = templateProperties.filter((val: string): boolean => {
            return /Ref$/i.test(val);
        });
        for (let tempName of templateProperties) {
            let propName: string = tempName.replace('Ref', '');
            setValue(propName.replace('_', '.'), getValue(propName, this), this.propCollection);
        }

        // Angular 9 compatibility to overcome ngOnchange not get triggered issue
        // To Update properties to "this.propCollection"
        let propList: string[] = Object.keys(this);
        /* istanbul ignore next */
        if (this.directivePropList) {
        for (let k: number = 0; k < this.directivePropList.length; k++) {
            let dirPropName: string = this.directivePropList[k];
            if (propList.indexOf(dirPropName) !== -1) {
                setValue(dirPropName, getValue(dirPropName, this), this.propCollection);
            }
        }
        this.hasChanges = true;
        }
    }

    protected registerEvents(eventList: string[]): void {
        registerEvents(eventList, this, true);
    }

    public ngOnChanges(changes: SimpleChanges): void {
        for (let propName of Object.keys(changes)) {
            let changedVal: SimpleChange = changes[propName];
            this.propCollection[propName] = changedVal.currentValue;
        }
        this.isUpdated = false;
        this.hasChanges = true;
    }
    /* istanbul ignore next */
    public clearTemplate(templateNames: string[]): void {
        clearTemplate(this, templateNames);
    }

    public getProperties(): { [key: string]: Object } {
        /* istanbul ignore next */
        for (let tagObject of this.tagObjects) {
            this.propCollection[tagObject.name] = tagObject.instance.getProperties();
        }
        return this.propCollection;
    }

    public isChanged(): boolean {
        let result: boolean = this.hasChanges;
        /* istanbul ignore next */
        for (let item of this.tagObjects) {
            result = result || item.instance.hasChanges;
        }
        return result;
    }

    public ngAfterContentChecked(): void {
        this.hasChanges = this.isChanged();
        let templateProperties: string[] = Object.keys(this);
        templateProperties = templateProperties.filter((val: string) => {
            return /Ref$/i.test(val);
        });
        // For angular 9 compatibility
        // ngOnchange hook not get triggered for copmplex directive
        // Due to this, we have manually set template properties v alues once we get template property reference
        for (let tempName of templateProperties) {
            let propName: string = tempName.replace('Ref', '');
            let val: Object = {};
            setValue(propName.replace('_', '.'), getValue(propName, this), this.propCollection);
        }
    }

    public ngAfterViewChecked(): void {
        /* istanbul ignore next */
        if (this.isUpdated) {
            this.hasChanges = false;
        }
    }

}

export class ArrayBase<T> {
    public isInitChanges: boolean;
    public list: T[] & ComplexBase<T>[] = [];
    public children: QueryList<T>;
    public hasChanges: boolean = false;
    private propertyName: string;
    public hasNewChildren: boolean;

    constructor(propertyName: string) {
        this.propertyName = propertyName;
    }

    public ngOnInit(): void {
        this.isInitChanges = true;
    }

    public ngAfterContentInit(): void {
        let index: number = 0;
        /* istanbul ignore next */
        this.list = this.children.map((child: T & ComplexBase<T>) => {
            child.index = index++;
            child.property = this.propertyName;
            return child;
        });
        this.hasChanges = true;
    }

    public getProperties(): Object[] {
        let onlyProp: Object[] = [];
        for (let item of this.list) {
            onlyProp.push((<{ getProperties: Function }>item).getProperties());
        }
        return onlyProp;
    }

    public isChanged(): boolean {
        let result: boolean = false;
        let index: number = 0;
        let isSourceChanged: boolean = false;
        // tslint:disable-next-line
        let childrenDataSource: any = this.children.map(
          (child: T & ComplexBase<T>) => {
            return child;
          }
        );
        /* istanbul ignore next */
        if (this.list.length === this.children.length) {
            for (let i: number = 0; i < this.list.length; i++) {
                if (this.list[i].propCollection.dataSource) {
                    if (this.list[i].dataSource && this.list[i].propCollection.dataSource !== this.list[i].dataSource) {
                        this.list[i].propCollection.dataSource = this.list[i].dataSource;
                        this.list[i].hasChanges = true;
                    }
                    isSourceChanged = (JSON.stringify(this.list[i].propCollection.dataSource) !==
                        JSON.stringify(childrenDataSource[i].propCollection.dataSource));
                } else {
                    // tslint:disable-next-line
                    let keys: any = Object.keys(this.list[i].propCollection);
                    for (let j: number = 0; j < keys.length; j++) {
                        if (this.list[i].propCollection[keys[j]] &&
                        this.list[i].propCollection[keys[j]].constructor.name === 'TemplateRef_') {
                            isSourceChanged = true;
                            break;
                        }
                    }
                }
            }
        }

        this.hasNewChildren = (this.list.length !== this.children.length || isSourceChanged) ? true : null;
        if (this.hasNewChildren) {
            this.list = this.children.map((child: T & ComplexBase<T>) => {
                child.index = index++;
                child.property = this.propertyName;
                return child;
            });
        }
        /* istanbul ignore end */
        for (let item of this.list) {
            result = result || (<{ hasChanges: boolean }>item).hasChanges;
        }
        return !!this.list.length && result;
    }

    public clearTemplate(templateNames: string[]): void {
        /* istanbul ignore next */
        for (let item of this.list) {
            (<{ clearTemplate: Function }>item).clearTemplate(templateNames && templateNames.map((val: string): string => {
                return new RegExp(this.propertyName).test(val) ? val.replace(this.propertyName + '.', '') : val;
            }));
        }
    }

    public ngAfterContentChecked(): void {
        this.hasChanges = this.isChanged();
        for (let i: number = 0; i < this.list.length; i++) {
            this.list[i].isUpdated = true;
        }
    }

    public ngAfterViewInit(): void {
        this.isInitChanges = false;
    }

}
