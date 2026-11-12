import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';

import { ICellRendererAngularComp } from '@ag-grid-community/angular';

@Component({
    selector: 'app-btn-checkbox-rendered',
    templateUrl: './btn-checkbox-rendered.component.html',
    styles: [],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class BtnCheckboxRenderedComponent implements ICellRendererAngularComp {

  public params: any;

  agInit(params: any): void {
    this.params = params;
  }

  refresh(params: any): boolean {
    this.params = params;
    return true;
  }

  public invokeParentMethod() {
    this.params.context.componentParent.methodFromParent(
      `Row: ${this.params.node.rowIndex}, Col: ${this.params.colDef.headerName}`
    );
  }

  canEdit(): boolean {
    const editable = this.params?.colDef?.editable;
    return typeof editable === 'function' ? !!editable(this.params) : !!editable;
  }

  btnCheckedHandler(event: MatCheckboxChange): void {
    if (this.canEdit()) {
      this.params.node.setDataValue(this.params.colDef.field, event.checked);
    }
  }

  getParams(){
    return this.params;
  }

  isChecked(): boolean {
    const field = this.params?.colDef?.field;
    return this.params?.data?.[field] === true;
  }

}
