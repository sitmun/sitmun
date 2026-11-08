import { AgGridModule } from '@ag-grid-community/angular';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { EntityFormAlertsComponent } from '@app/components/shared/entity-form-alerts/entity-form-alerts.component';
import { FormToolbarComponent } from '@app/components/shared/form-toolbar/form-toolbar.component';
import { ExternalConfigurationService } from '@app/core/config/external-configuration.service';
import { ExternalService, ResourceService } from '@app/core/hal';
import { MessagesInterceptor } from '@app/core/interceptors/messages.interceptor';
import {
  CodeListService, RoleService, TaskAvailabilityService, TaskService,
  TerritoryService, TranslationService, TaskUIService, TaskTypeService,
  TaskGroupService, ConnectionService, CartographyService, TaskProjection
} from '@app/domain';
import { SitmunFrontendGuiModule } from '@app/frontend-gui/src/lib/public_api';
import { MaterialModule } from '@app/material-module';
import { LoggerService } from '@app/services/logger.service';
import { configureLoggerForTests, provideErrorHandlerForTests } from '@app/testing/test-helpers';
import { environment } from '@environments/environment';

import { TaskQueryFormComponent } from './task-query-form.component';

describe('TaskQueryFormComponent', () => {
  let component: TaskQueryFormComponent;
  let fixture: ComponentFixture<TaskQueryFormComponent>;

  beforeAll(async () => {
    await TestBed.configureTestingModule({
      teardown: { destroyAfterEach: 0 as any },
      declarations: [TaskQueryFormComponent, FormToolbarComponent],
      imports: [
        FormsModule,
        ReactiveFormsModule,
        RouterModule.forRoot([], {}),
        SitmunFrontendGuiModule,
        AgGridModule,
        EntityFormAlertsComponent,
        MaterialModule,
        MatIconTestingModule,
        BrowserAnimationsModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: () => ({
              getTranslation: () => of({})
            })
          }
        })
      ],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: MessagesInterceptor, multi: true },
        provideErrorHandlerForTests(),
        TaskService,
        TaskUIService,
        TaskTypeService,
        TaskGroupService,
        ConnectionService,
        CartographyService,
        RoleService,
        TerritoryService,
        TaskAvailabilityService,
        CodeListService,
        TranslationService,
        ResourceService,
        ExternalService,
        { provide: 'ExternalConfigurationService', useClass: ExternalConfigurationService }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskQueryFormComponent);
    component = fixture.componentInstance;
    const loggerService = TestBed.inject(LoggerService);
    configureLoggerForTests(loggerService);
    component.entityToEdit = component.empty();
    component.postFetchData();
    fixture.detectChanges();
  });

  const createComponent = () => {
    const translateService = (component as any).translateService;
    jest.spyOn(translateService, 'instant').mockImplementation((key: string, params?: Record<string, unknown>) => {
      const firstParam = Object.values(params || {})[0];
      return typeof firstParam === 'string' ? `${key}|${firstParam}` : key;
    });
    return component;
  };

  afterEach(() => fixture?.destroy());
  afterAll(() => TestBed.resetTestingModule());

  it('does not treat an unset scope as an unknown type', () => {
    const spy = jest.spyOn(console, 'error');
    spy.mockClear();
    component.configureForm(null);
    expect(spy.mock.calls.some((call) => String(call[0]).includes('Unknown task query scope'))).toBe(false);
  });

  

  describe('Grid capability classification', () => {
    it('rolesTable should have picker, updater, and status capabilities', () => {
      const table = component['rolesTable'];
      expect(table.hasPickerAdd()).toBe(true);
      expect(table.hasRelationsUpdater()).toBe(true);
      expect(table.hasStatusColumn()).toBe(true);
      expect(table.hasTemplateDialogs()).toBe(false);
    });

    it('availabilitiesTable should have picker, updater, and status capabilities', () => {
      const table = component['availabilitiesTable'];
      expect(table.hasPickerAdd()).toBe(true);
      expect(table.hasRelationsUpdater()).toBe(true);
      expect(table.hasStatusColumn()).toBe(true);
      expect(table.hasTemplateDialogs()).toBe(false);
    });

    it('parametersTable should have template-dialog, updater, status, and duplicate capabilities', () => {
      const table = component['parametersTable'];
      expect(table.hasTemplateDialogs()).toBe(true);
      expect(table.hasRelationsUpdater()).toBe(true);
      expect(table.hasStatusColumn()).toBe(true);
      expect(table.supportsDuplicate()).toBe(true);
      expect(table.hasPickerAdd()).toBe(false);
    });
  });

  it('blocks save and shows deterministic warning when command placeholders are undeclared', () => {
    const component = createComponent();
    component.entityToEdit = TaskProjection.fromObject({
      id: 10,
      name: 'query',
      properties: {
        command: 'https://example.com/${zeta}?layer={alpha}&app=#{APP_ID}&territory=#{territory.id}&repeat={alpha}',
        parameters: [],
      },
    });
    component.entityForm = new FormGroup({
      name: new FormControl('query'),
      scope: new FormControl('web-api-query'),
      command: new FormControl('https://example.com/${zeta}?layer={alpha}&app=#{APP_ID}&territory=#{territory.id}&repeat={alpha}'),
      connectionId: new FormControl(null),
      cartographyId: new FormControl(null),
      taskGroupId: new FormControl(1),
    });
    component.entityForm.markAsDirty();

    expect((component as any).customWarningMessage).toBe('entity.task.query.missingDeclaredParameters|alpha, zeta');
    expect(component.canSaveEntity).toBe(false);
    expect(component.canSave()).toBe(false);
  });

  it('uses pending parameter grid rows to validate command placeholders', () => {
    const component = createComponent();
    component.entityToEdit = TaskProjection.fromObject({
      id: 10,
      name: 'query',
      properties: {
        command: 'https://example.com/{layerid}/${featureid}',
        parameters: [],
      },
    });
    component.entityForm = new FormGroup({
      name: new FormControl('query'),
      scope: new FormControl('URL'),
      command: new FormControl('https://example.com/{layerid}/${featureid}'),
      connectionId: new FormControl(null),
      cartographyId: new FormControl(null),
      taskGroupId: new FormControl(1),
    });
    component.entityForm.markAsDirty();
    (component as any).parametersGrid = {
      rowData: [
        { name: 'featureid' },
        { name: 'layerid', status: 'pendingRegistration' },
      ],
    };

    expect((component as any).customWarningMessage).toBe('');
    expect(component.canSave()).toBe(true);
    expect(component.canSaveEntity).toBe(true);
  });

  it('ignores parameters pending delete when validating command placeholders', () => {
    const component = createComponent();
    component.entityToEdit = TaskProjection.fromObject({
      id: 10,
      name: 'query',
      properties: {
        command: 'https://example.com/{layerid}',
        parameters: [],
      },
    });
    component.entityForm = new FormGroup({
      name: new FormControl('query'),
      scope: new FormControl('URL'),
      command: new FormControl('https://example.com/{layerid}'),
      connectionId: new FormControl(null),
      cartographyId: new FormControl(null),
      taskGroupId: new FormControl(1),
    });
    component.entityForm.markAsDirty();
    (component as any).parametersGrid = {
      rowData: [
        { name: 'layerid', status: 'pendingDelete' },
      ],
    };

    expect((component as any).customWarningMessage).toBe('entity.task.query.missingDeclaredParameters|layerid');
    expect(component.canSave()).toBe(false);
  });

  it('treats loaded but empty parameter grid as empty instead of falling back to persisted properties', () => {
    const component = createComponent();
    component.entityToEdit = TaskProjection.fromObject({
      id: 10,
      name: 'query',
      properties: {
        command: 'https://example.com/{layerid}',
        parameters: [
          { name: 'layerid' },
        ],
      },
    });
    component.entityForm = new FormGroup({
      name: new FormControl('query'),
      scope: new FormControl('web-api-query'),
      command: new FormControl('https://example.com/{layerid}'),
      connectionId: new FormControl(null),
      cartographyId: new FormControl(null),
      taskGroupId: new FormControl(1),
    });
    component.entityForm.markAsDirty();
    (component as any).parametersGrid = {
      rowData: [],
    };

    expect((component as any).customWarningMessage).toBe('entity.task.query.missingDeclaredParameters|layerid');
    expect(component.canSaveEntity).toBe(false);
  });

  it('reads sql parameters from the loaded parameters grid', () => {
    const component = createComponent();
    (component as any).codeValues = { queryTaskScope: { sqlQuery: 'sql-query' } };
    component.entityForm = new FormGroup({
      scope: new FormControl('sql-query'),
      command: new FormControl('select ${p}'),
      connectionId: new FormControl(1),
    });
    (component as any).sqlParameters = [{ name: 'stale' }];
    (component as any).parametersGrid = {
      dataGrid: {
        gridApi: { isDestroyed: () => false },
        rowData: [{ name: 'stale' }],
      },
      getAllCurrentData: () => [{ name: 'p', status: 'pendingCreation' }, { name: 'gone', status: 'pendingDelete' }],
    };

    expect((component as any).ensureSqlParameters().map((parameter) => parameter.name)).toEqual(['p']);
  });

  it('keeps format and test on the sql card and does not render the parameter table', () => {
    component.dataLoaded = true;
    (component as any).codeValues = { queryTaskScope: { sqlQuery: 'sql-query' } };
    component.entityForm.get('scope')?.setValue('sql-query');
    component.entityForm.get('command')?.setValue('select 1');
    component.entityForm.get('connectionId')?.setValue(1);
    fixture.detectChanges();

    const formatButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="sql-format"]');
    const testButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="sql-test"]');
    expect(formatButton.classList).toContain('mat-mdc-raised-button');
    expect(formatButton.classList).toContain('mat-primary');
    expect(testButton.classList).toContain('mat-mdc-raised-button');
    expect(testButton.classList).toContain('mat-primary');
    expect(fixture.nativeElement.querySelector('[data-testid="sql-parameters"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="sql-add-parameter"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="sql-editor"]')).not.toBeNull();
  });

  it('formats a query, keeps #{MUN_INES}, and writes the same text into the editor', () => {
    component.dataLoaded = true;
    (component as any).codeValues = { queryTaskScope: { sqlQuery: 'sql-query' } };
    component.entityForm.get('scope')?.setValue('sql-query');
    component.entityForm.get('command')?.setValue('select 1');
    fixture.detectChanges();

    expect(component['sqlEditorView']).not.toBeNull();
    component.entityForm.get('command')?.setValue(
      'SELECT TUI_NAME AS name FROM STM_TSK_UI WHERE TUI_NAME IN (#{MUN_INES})'
    );
    component['formatSql']();

    const command = String(component.entityForm.get('command')?.value);
    const document = component['sqlEditorView'].state.doc.toString();
    expect(command).toContain('\n');
    expect(command).toContain('#{MUN_INES}');
    expect(document).toContain('\n');
    expect(document).toContain('#{MUN_INES}');
  });

  it('opens the sql test dialog with admin dialog chrome', async () => {
    component.dataLoaded = true;
    (component as any).codeValues = { queryTaskScope: { sqlQuery: 'sql-query' } };
    component.entityForm.get('scope')?.setValue('sql-query');
    component.entityForm.get('command')?.setValue('select ${p}');
    component.entityForm.get('connectionId')?.setValue(1);
    (component as any).sqlParameters = [{ name: 'p', provided: false, value: '' }];
    (component as any).openSqlTest();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = document.querySelector('[data-testid="sql-test-dialog"]');
    expect(dialog?.querySelector('[mat-dialog-title]')).not.toBeNull();
    expect(dialog?.querySelector('mat-dialog-content')).not.toBeNull();
    expect(dialog?.querySelector('mat-dialog-actions')).not.toBeNull();
    const limit = dialog?.querySelector('[data-testid="sql-limit"]') as HTMLInputElement;
    const offset = dialog?.querySelector('[data-testid="sql-offset"]') as HTMLInputElement;
    expect(limit.closest('mat-form-field')?.getAttribute('appearance')).toBe('outline');
    expect(offset.closest('mat-form-field')?.getAttribute('appearance')).toBe('outline');
    expect(limit.value).toBe('10');
    expect(offset.value).toBe('0');
    const run = dialog?.querySelector('[data-testid="sql-test-run"]') as HTMLButtonElement;
    expect(run.classList).toContain('mat-mdc-mini-fab');
    expect(run.closest('mat-dialog-actions')).not.toBeNull();
    expect(dialog?.querySelector('[data-testid="sql-client-p"]')?.closest('mat-form-field')?.getAttribute('appearance')).toBe('outline');
    (component as any).dialog.closeAll();
  });

  it('enables save for a sql query only after a passing test and disables it after an edit', () => {
    const component = createComponent();
    (component as any).codeValues = { queryTaskScope: { sqlQuery: 'sql-query' } };
    component.entityToEdit = TaskProjection.fromObject({
      id: 10,
      name: 'query',
      properties: { command: 'SELECT ${p} AS echo', parameters: [] },
    });
    component.entityForm = new FormGroup({
      name: new FormControl('query'),
      scope: new FormControl('sql-query'),
      command: new FormControl('SELECT ${p} AS echo'),
      connectionId: new FormControl(90),
      cartographyId: new FormControl(null),
      taskGroupId: new FormControl(1),
    });
    component.entityForm.markAsDirty();
    (component as any).sqlParameters = [{
      name: 'p',
      label: 'Echo',
      value: '',
      dataType: 'string',
      provided: false,
      optional: false,
      type: 'query',
    }];

    expect(component.canSaveEntity).toBe(false);
    (component as any).passedFingerprint = (component as any).sqlFingerprint();
    expect(component.canSaveEntity).toBe(true);
    component.entityForm.get('command')?.setValue('SELECT ${p} AS name');
    expect(component.canSaveEntity).toBe(false);
  });

  it('rejects save click path when command placeholders are missing', async () => {
    const component = createComponent();
    component.entityToEdit = TaskProjection.fromObject({
      id: 10,
      name: 'query',
      properties: {
        command: 'https://example.com/{layerid}',
        parameters: [],
      },
    });
    component.entityForm = new FormGroup({
      name: new FormControl('query'),
      scope: new FormControl('web-api-query-no-proxy'),
      command: new FormControl('https://example.com/{layerid}'),
      connectionId: new FormControl(null),
      cartographyId: new FormControl(null),
      taskGroupId: new FormControl(1),
    });
    component.entityForm.markAsDirty();
    const saveEntitySpy = jest.spyOn(component, 'saveEntity').mockResolvedValue(undefined);
    jest.spyOn(component, 'fetchOriginal').mockResolvedValue(component.entityToEdit);

    const result = await component.onSaveButtonClicked();

    expect(result).toBe(false);
    expect(saveEntitySpy).not.toHaveBeenCalled();
  });

  it('rejects invalid sql parameter drafts and derives required on a valid one', () => {
    const formComponent = createComponent();
    (formComponent as any).codeValues = { queryTaskScope: { sqlQuery: 'sql-query' } };
    formComponent.entityForm = new FormGroup({
      scope: new FormControl('sql-query'),
    });
    (formComponent as any).systemVariables = new Map<string, string>([['USER_ID', '1']]);
    (formComponent as any).parametersGrid = {
      dataGrid: { gridApi: { isDestroyed: () => false } },
      getAllCurrentData: () => [{ name: 'taken', type: 'query' }],
    };

    const form = (formComponent as any).newParameterForm() as FormGroup;
    const name = form.get('name');
    const value = form.get('value');

    name?.setValue('1bad');
    expect(name?.hasError('invalidName')).toBe(true);

    name?.setValue('limit');
    expect(name?.hasError('reserved')).toBe(true);
    name?.setValue('offset');
    expect(name?.hasError('reserved')).toBe(true);

    name?.setValue('USER_ID');
    expect(name?.hasError('systemName')).toBe(true);

    name?.setValue('taken');
    expect(name?.hasError('duplicate')).toBe(true);

    name?.setValue('p');
    value?.setValue('#{X}');
    expect(value?.hasError('noSystemExpression')).toBe(true);

    value?.setValue('');
    form.get('provided')?.setValue(true);
    expect(value?.hasError('providedNeedsValue')).toBe(true);

    form.get('provided')?.setValue(false);
    value?.setValue('kept');
    form.get('optional')?.setValue(true);
    expect(value?.hasError('optionalHasValue')).toBe(true);

    form.get('optional')?.setValue(false);
    value?.setValue('');
    form.get('label')?.setValue('Echo');
    form.get('dataType')?.setValue('string');
    form.get('type')?.setValue('query');
    expect(form.valid).toBe(true);

    const saved = (formComponent as any).parameterFromDialog(form.getRawValue());
    expect(saved.required).toBe(true);
    expect(saved.type).toBe('query');

    formComponent.entityForm.get('scope')?.setValue('web-api-query');
    name?.setValue('limit');
    expect(name?.errors).toBeNull();
  });

  it('shows the query-test problem detail instead of an empty sequence', async () => {
    const httpMock = TestBed.inject(HttpTestingController);
    component.entityForm.get('connectionId')?.setValue(7);
    component.entityForm.get('command')?.setValue('select * from stm_geoinfo acm');

    const pending = component['runSqlTest']();
    const request = httpMock.expectOne(`${environment.apiBaseURL}/api/tasks/query/test`);
    request.flush({
      type: 'https://sitmun.org/problems/entity-not-found',
      title: 'Entity Not Found',
      status: 404,
      detail: 'Connection not found'
    }, { status: 404, statusText: 'Not Found' });
    await pending;

    expect(component['sqlTestError']).toBe('Connection not found');
    expect(component['sqlTestResult']).toBeNull();
  });

  it('keeps a successful run with zero rows out of the error line', async () => {
    const httpMock = TestBed.inject(HttpTestingController);
    component.entityForm.get('connectionId')?.setValue(7);
    component.entityForm.get('command')?.setValue('select * from stm_geoinfo acm');

    const pending = component['runSqlTest']();
    const request = httpMock.expectOne(`${environment.apiBaseURL}/api/tasks/query/test`);
    request.flush({
      runs: [
        { label: 'Run 1 as written', sql: 'select * from stm_geoinfo acm', ok: true, rows: [], values: [] },
        { label: 'Run 2 one page', sql: 'select * from stm_geoinfo acm', ok: true, rows: [], values: [] }
      ]
    });
    await pending;

    expect(component['sqlTestError']).toBe('');
    expect(component['sqlTestResult']?.runs).toHaveLength(2);
    expect(component['sqlTestResult']?.runs?.[0]?.['rows']).toEqual([]);
  });
});
