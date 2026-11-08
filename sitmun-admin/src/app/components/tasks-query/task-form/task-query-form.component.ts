import {HttpClient, HttpContext} from "@angular/common/http";
import {AfterViewChecked, Component, ElementRef, TemplateRef, ViewChild, ChangeDetectionStrategy} from "@angular/core";
import {AbstractControl, FormControl, FormGroup, ValidationErrors, Validators} from "@angular/forms";
import {MatDialog} from "@angular/material/dialog";
import {MatSelectChange} from "@angular/material/select";
import {MatTabChangeEvent} from "@angular/material/tabs";
import {ActivatedRoute, Router} from "@angular/router";

import {ColDef} from "@ag-grid-community/core";
import {sql, PostgreSQL, MSSQL, StandardSQL} from "@codemirror/lang-sql";
import {defaultHighlightStyle, syntaxHighlighting} from "@codemirror/language";
import {EditorState, Extension, StateEffect} from "@codemirror/state";
import {Decoration, EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view";
import {TranslateService} from "@ngx-translate/core";
import { firstValueFrom, map, of} from "rxjs";
import {format} from "sql-formatter";

import {BaseFormComponent} from "@app/components/base-form.component";
import {DataTableDefinition, TemplateDialog} from "@app/components/data-tables.util";
import {RelationGridComponent} from "@app/components/shared/relation-grid/relation-grid.component";
import {Configuration} from "@app/core/config/configuration";
import {MessagesInterceptorStateService, SKIP_MESSAGES_INTERCEPTOR} from "@app/core/interceptors/messages.interceptor";
import {
  Cartography,
  CartographyService,
  CodeList,
  CodeListService,
  Connection,
  ConnectionService,
  Role,
  RoleService,
  Task,
  TaskAvailability,
  TaskAvailabilityProjection,
  TaskAvailabilityService,
  TaskGroup,
  TaskGroupService,
  TaskProjection,
  TaskService,
  TaskType,
  TaskTypeService,
  TaskUIService,
  TerritoryProjection,
  TerritoryService,
  TranslationService
} from "@app/domain";
import { TaskPropertiesContract } from "@app/domain/task/models/task-properties";
import { TaskPropertiesBuilder } from "@app/domain/task/models/task-properties.builder";
import {TaskParameterType, TaskQueryParameter} from "@app/domain/task/models/task-query-parameter.model";
import {
  canKeepOrUpdate,
  onCreate,
  onDelete,
  onUpdatedRelation,
  Status
} from "@app/frontend-gui/src/lib/data-grid/data-grid.component";
import {ErrorHandlerService} from "@app/services/error-handler.service";
import {LoadingOverlayService} from "@app/services/loading-overlay.service";
import {LoggerService} from "@app/services/logger.service";
import {UtilsService} from "@app/services/utils.service";
import { compareNullableString } from '@app/utils/compare-nullable-string';
import { formatValidationErrors, getErrorMessage } from '@app/utils/problem-detail.utils';
import {magic} from "@environments/constants";
import {environment} from "@environments/environment";

import { scanSql, SqlScan } from "../sql-placeholder-scanner";

/**
 * Component for managing query tasks in the SITMUN application.
 * Provides a form interface for creating, editing, and duplicating query tasks.
 *
 * This component handles:
 * - Task metadata (name, scope, command)
 * - Connection or cartography selection based on query scope
 * - Task role assignments
 * - Task availability per territory
 * - Task parameters configuration
 *
 * Each query task is associated with a specific task type and task group.
 *
 * @extends BaseFormComponent<TaskProjection>
 */
@Component({
    selector: 'app-task-query-form',
    templateUrl: './task-query-form.component.html',
    styles: [`
      .sql-editor { min-height: 8rem; }
      .sql-problems { color: #c62828; margin: 0 0 8px; }
      .sql-test-dialog, .sql-run-banner {
        font-family: "Open Sans", sans-serif;
      }
      .sql-run-banner { display: flex; align-items: flex-start; gap: 8px; margin: 0 0 12px; }
      .sql-run-banner span { white-space: pre-wrap; }
      .sql-run-banner-icon { flex: 0 0 auto; }
      .sql-run-banner-icon--ok { color: #4caf50; }
      .sql-run-banner-icon--error { color: #f44336; }
      .sql-run-banner-icon--warn { color: #f57c00; }
      .sql-run-banner-icon--info { color: #1976d2; }
      .sql-run-label-icon { font-size: 18px; width: 18px; height: 18px; vertical-align: text-bottom; }
      .sql-run-grid { width: 100%; margin: 8px 0; }
      .sql-editor.sql-run-editor { min-height: 0; margin: 0; border: 0; }
    `],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class TaskQueryFormComponent extends BaseFormComponent<TaskProjection> implements AfterViewChecked {
  private static readonly COMMAND_PLACEHOLDER_PATTERN = /([#$]?)\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
  private static readonly refreshSqlMarks = StateEffect.define<null>();

  readonly config = Configuration.TASK_QUERY;

  /**
   * Data table definition for managing role assignments to the task.
   * Configures the roles grid with columns, data fetching, and update operations.
   */
  protected readonly rolesTable: DataTableDefinition<Role, Role>;

  /**
   * Data table definition for managing task availabilities per territory.
   * Configures the availability grid with columns, data fetching, and update operations.
   */
  protected readonly availabilitiesTable: DataTableDefinition<TaskAvailabilityProjection, TerritoryProjection>;

  /**
   * Data table definition for managing task parameters.
   * Configures the parameters grid with columns, data fetching, and update operations.
   */
  protected readonly parametersTable: DataTableDefinition<TaskQueryParameter, TaskQueryParameter>;

  /**
   * The name of the task type associated with this task.
   * Determined from route parameters.
   */
  private taskTypeName: string = null;

  /**
   * The translated name of the task type.
   * Used for display in the UI.
   */
  protected taskTypeNameTranslated: string = null;

  /**
   * The task type entity associated with this task.
   * Retrieved during initialization.
   */
  private taskType: TaskType = null;

  protected taskGroupList: TaskGroup[] = [];

  /**
   * Reference to the dialog template for adding new parameters.
   * Used by the parameters table for creating new task parameters.
   */
  @ViewChild('newParameterDialog', {static: true})
  private readonly newParameterDialog: TemplateRef<any>;

  @ViewChild('parametersGrid')
  private readonly parametersGrid?: RelationGridComponent;

  /**
   * The TaskParameterType enum exposed to the template
   */
  protected readonly TaskParameterType = TaskParameterType;
  protected systemVariables: Map<string, string> = new Map();
  protected sqlParameters: Array<Record<string, unknown>> | null = null;
  protected sqlProblems: string[] = [];
  protected sqlTestError = '';
  protected sqlTestResult: { runs?: Array<Record<string, unknown>> } | null = null;
  protected testLimit = 10;
  protected testOffset = 0;
  protected testClientValues: Record<string, string> = {};
  protected testSystemValues: Record<string, string> = {};
  private passedFingerprint = '';
  private sqlEditorView: EditorView | null = null;
  private sqlRunEditors: EditorView[] = [];
  private pendingRunEditors = false;
  protected sqlRunTab = 0;

  @ViewChild('sqlEditorHost')
  private sqlEditorHost?: ElementRef<HTMLElement>;

  @ViewChild('sqlTestDialog', {static: true})
  private readonly sqlTestDialog: TemplateRef<unknown>;

  protected readonly sqlDataTypes = ['string', 'integer', 'number', 'date', 'timestamp', 'boolean'];

  /**
   * Gets the name of a cartography by its ID
   * @param cartographyId - The ID of the cartography
   * @returns The name of the cartography or empty string if not found
   */
  getCartographyName(cartographyId: number): string {
    const cartography = this.cartographies.find(cart => cart.id === cartographyId);
    return cartography?.name || '';
  }

  /**
   * Gets the name of a connection by its ID
   * @param connectionId - The ID of the connection
   * @returns The name of the connection or empty string if not found
   */
  getConnectionName(connectionId: number): string {
    const connection = this.connections.find(conn => conn.id === connectionId);
    return connection?.name || '';
  }

  /**
   * Checks if the parameter type is QUERY
   * @returns boolean indicating if parameter type is QUERY
   */
  isQueryParameterType(): boolean {
    return this.parametersTable.templateDialog('newParameterDialog').form.get('type')?.value === TaskParameterType.QUERY;
  }

  /**
   * The list of connections
   */
  protected connections: Connection[] = [];

  /**
   * The list of cartographies
   */
  protected cartographies: Cartography[] = [];

  /**
   * Checks if the current task scope is SQL query
   * @returns boolean indicating if scope is SQL query
   */
  isSqlQueryScope(): boolean {
    return this.entityForm?.value?.scope === this.codeValues.queryTaskScope.sqlQuery;
  }

  /**
   * Checks if the current task scope is Web API query
   * @returns boolean indicating if scope is Web API query
   */
  isWebApiQueryScope(): boolean {
    return this.entityForm?.value?.scope === this.codeValues.queryTaskScope.webApiQuery;
  }

  isWebApiQueryNoProxyScope(): boolean {
    return this.entityForm?.value?.scope === this.codeValues.queryTaskScope.webApiQueryNoProxy;
  }

  /**
   * Checks if the current task scope is Cartography query
   * @returns boolean indicating if scope is Cartography query
   */
  isCartographyQueryScope(): boolean {
    return this.entityForm?.value?.scope === this.codeValues.queryTaskScope.cartographyQuery;
  }

  isUrlQueryScope(): boolean {
    return this.entityForm?.value?.scope === this.codeValues.queryTaskScope.urlQuery;
  }

  /**
   * Returns the codelist entries for the API key name selector,
   * depending on the currently selected API key type.
   */
  get currentApiKeyCodeList(): CodeList[] {
    const type = this.entityForm?.get('apiKeyType')?.value;
    if (type === 'X-API-Key') return this.codeList('apiKey.header');
    if (type === 'Cookie') return this.codeList('apiKey.cookie');
    if (type === 'QueryParam') return this.codeList('apiKey.queryParam');
    return [];
  }

  protected getSystemVariablesHelp(): string {
    if (this.systemVariables.size === 0) {
      return 'Loading...';
    }

    return Array.from(this.systemVariables.keys())
      .map(key => `#{${key}}`)
      .join(', ');
  }

  /**
   * Constructor for the TaskQueryFormComponent.
   * Initializes the component with necessary services and sets up the form.
   *
   * @param dialog - Material dialog service for modal dialogs
   * @param translateService - Service for handling translations
   * @param translationService - Service for managing entity translations
   * @param codeListService - Service for accessing code lists
   * @param errorHandler - Service for handling errors
   * @param activatedRoute - Service for accessing route parameters
   * @param router - Angular router service for navigation
   * @param loadingService
   * @param messagesInterceptorState
   * @param loadingService
   * @param messagesInterceptorState
   * @param taskService - Service for task CRUD operations
   * @param taskUIService - Service for managing task UIs
   * @param utils - Utility service with common functions
   * @param loggerService - Service for logging
   * @param taskTypeService - Service for managing task types
   * @param roleService - Service for managing roles
   * @param taskGroupService - Service for managing task groups
   * @param territoryService - Service for accessing territories
   * @param taskAvailabilityService - Service for managing task availabilities
   * @param connectionService - Service for database connections
   * @param cartographyService - Service for cartography management
   * @param http
   */
  constructor(
    dialog: MatDialog,
    translateService: TranslateService,
    translationService: TranslationService,
    codeListService: CodeListService,
    loggerService: LoggerService,
    errorHandler: ErrorHandlerService,
    activatedRoute: ActivatedRoute,
    router: Router,
    loadingService: LoadingOverlayService,
    messagesInterceptorState: MessagesInterceptorStateService,
    protected taskService: TaskService,
    protected taskUIService: TaskUIService,
    protected utils: UtilsService,
    protected taskTypeService: TaskTypeService,
    protected roleService: RoleService,
    protected taskGroupService: TaskGroupService,
    protected territoryService: TerritoryService,
    protected taskAvailabilityService: TaskAvailabilityService,
    protected connectionService: ConnectionService,
    protected cartographyService: CartographyService,
    protected http: HttpClient
  ) {
    super(dialog, translateService, translationService, codeListService, loggerService, errorHandler, activatedRoute, router, loadingService, messagesInterceptorState);
    this.rolesTable = this.defineRolesTable();
    this.availabilitiesTable = this.defineAvailabilitiesTable();
    this.parametersTable = this.defineParametersTable();
  }

  /**
   * Initializes component data before fetching.
   * Extracts task type from route, registers data tables, and loads required data.
   *
   * @returns Promise that resolves when initialization is complete
   * @throws Error if task type or group is not found
   */
  override async preFetchData() {
    const type = magic.taskQueryTypeId;

    try {
      const variables = await firstValueFrom(
        this.http.get<Record<string, string>>(`${environment.apiBaseURL}/api/config/system/variables`)
      );
      this.systemVariables = new Map(Object.entries(variables));
    } catch (error) {
      console.warn('Failed to load system variables:', error);
    }

    // Register data tables for roles, availabilities, and parameters
    this.dataTables.register(this.rolesTable)
      .register(this.availabilitiesTable)
      .register(this.parametersTable);
    await this.initCodeLists(['tasksEntity.type', 'queryTask.scope', 'queryTask.parameterType', 'service.authenticationMode', 'queryTask.mimeType', 'apiKey.header', 'apiKey.cookie', 'apiKey.queryParam']);
    this.initTranslations('Task', ['name'])

    const [taskTypes, taskGroups, connections, cartographies] = await Promise.all([
      firstValueFrom(this.taskTypeService.fetchAllRawItems()),
      firstValueFrom(this.taskGroupService.fetchAllRawItems()),
      firstValueFrom(this.connectionService.fetchAllRawItems()),
      firstValueFrom(this.cartographyService.fetchAllRawItems()),
    ]);

    this.connections = connections;
    this.cartographies = cartographies;

    this.taskType = taskTypes.find(taskType => taskType.id === type);
    this.taskTypeName = this.taskType.title;
    this.taskTypeNameTranslated = this.translateService.instant(`entity.task.query.label`);
    if (!this.taskType) {
      throw new Error(`Task type ${this.taskTypeName} not found`);
    }

    taskGroups.sort((a, b) => compareNullableString(a.name, b.name));
    this.taskGroupList = taskGroups;
  }

  /**
   * Fetches related data for the entity.
   * Loads translations for the current entity.
   *
   * @returns Promise that resolves when translations are loaded
   */
  override async fetchRelatedData() {
    return this.loadTranslations(this.entityToEdit);
  }

  /**
   * Fetches the original entity by ID.
   *
   * @returns Promise that resolves to the task projection
   */
  override fetchOriginal(): Promise<TaskProjection> {
    return firstValueFrom(this.taskService.fetchProjectionById(TaskProjection, this.entityID));
  }

  /**
   * Creates a copy of an existing entity for duplication.
   * Prefixes the name with "copy_" to distinguish from the original.
   *
   * @returns Promise that resolves to the duplicated task projection
   */
  override fetchCopy(): Promise<TaskProjection> {
    return firstValueFrom(this.taskService.fetchProjectionById(TaskProjection, this.duplicateID).pipe(map((copy: TaskProjection) => {
      copy.name = this.translateService.instant("common.copyPrefix") + copy.name;
      return copy;
    })));
  }

  /**
   * Creates an empty task entity with default values.
   *
   * @returns New empty task projection
   */
  override empty(): TaskProjection {
    return new TaskProjection()
  }

  /**
   * Initializes the form after entity data is fetched.
   * Sets up reactive form with entity values and validation rules.
   *
   * @throws Error if entity is undefined
   */
  override postFetchData() {
    if (!this.entityToEdit) {
      throw new Error('Cannot initialize form: entity is undefined');
    }

    this.entityForm = new FormGroup({
      name: new FormControl(this.entityToEdit.name, {
        validators: [Validators.maxLength(512), Validators.required],
        nonNullable: true
      }),
      scope: new FormControl(TaskPropertiesContract.getScope(this.entityToEdit.properties), {
        validators: [Validators.required],
        nonNullable: true
      }),
      command: new FormControl(TaskPropertiesContract.getCommand(this.entityToEdit.properties), {
        validators: [Validators.required],
        nonNullable: true
      }),
      connectionId: new FormControl(this.entityToEdit.connectionId, {
        validators: [Validators.required],
        nonNullable: true
      }),
      cartographyId: new FormControl(this.entityToEdit.cartographyId, {
        validators: [Validators.required],
        nonNullable: true
      }),
      taskGroupId: new FormControl(this.entityToEdit.groupId, {
        validators: [Validators.required],
        nonNullable: true
      }),
      authenticationMode: new FormControl(
        TaskPropertiesContract.getAuthenticationMode(this.entityToEdit.properties),
        { validators: [], nonNullable: false }
      ),
      user: new FormControl(
        TaskPropertiesContract.getUser(this.entityToEdit.properties),
        { validators: [], nonNullable: false }
      ),
      password: new FormControl(
        TaskPropertiesContract.getPassword(this.entityToEdit.properties),
        { validators: [], nonNullable: false }
      ),
      apiKeyType: new FormControl(
        TaskPropertiesContract.getApiKeyType(this.entityToEdit.properties),
        { validators: [], nonNullable: false }
      ),
      apiKeyKeyName: new FormControl(
        TaskPropertiesContract.getApiKeyKeyName(this.entityToEdit.properties),
        { validators: [], nonNullable: false }
      ),
      apiKeyHeaderValue: new FormControl(
        TaskPropertiesContract.getApiKeyHeaderValue(this.entityToEdit.properties),
        { validators: [], nonNullable: false }
      ),
      mimeType: new FormControl(
        TaskPropertiesContract.getMimeType(this.entityToEdit.properties),
        { validators: [], nonNullable: false }
      ),
      filename: new FormControl(
        TaskPropertiesContract.getFilename(this.entityToEdit.properties),
        { validators: [], nonNullable: false }
      )
    });
    // Backward compat: if API key data exists in headers/queryParams but authMode is not set
    const legacyApiKeyType = TaskPropertiesContract.getApiKeyType(this.entityToEdit.properties);
    const authMode = TaskPropertiesContract.getAuthenticationMode(this.entityToEdit.properties);
    if (legacyApiKeyType && authMode !== 'API key') {
      this.entityForm.get('authenticationMode')?.setValue('API key');
      this.entityForm.get('apiKeyType')?.setValue(legacyApiKeyType);
      this.entityForm.get('apiKeyKeyName')?.setValue(TaskPropertiesContract.getApiKeyKeyName(this.entityToEdit.properties));
      this.entityForm.get('apiKeyHeaderValue')?.setValue(TaskPropertiesContract.getApiKeyHeaderValue(this.entityToEdit.properties));
    }
    // Single subscription: clear dependent fields when auth mode changes
    this.entityForm.get('authenticationMode')?.valueChanges.subscribe(mode => {
      if (mode !== 'API key') {
        this.entityForm.get('apiKeyType')?.setValue(null);
        this.entityForm.get('apiKeyKeyName')?.setValue(null);
        this.entityForm.get('apiKeyHeaderValue')?.setValue(null);
      }
      if (mode !== 'HTTP Basic authentication') {
        this.entityForm.get('user')?.setValue(null);
        this.entityForm.get('password')?.setValue(null);
      }
    });
    // Clear key name when type changes (different codelist per type)
    this.entityForm.get('apiKeyType')?.valueChanges.subscribe(() => {
      this.entityForm.get('apiKeyKeyName')?.setValue(null);
    });
    this.configureForm(TaskPropertiesContract.getScope(this.entityToEdit.properties));
  }

  /**
   * Creates a Task object from the current form values.
   *
   * @param id - Optional ID for the new object, used when updating
   * @returns New Task instance populated with form values
   */
  createObject(id: number = null): Task {
    let safeToEdit = TaskProjection.fromObject(this.entityToEdit);
    const { authenticationMode, user, password, apiKeyType, apiKeyKeyName, apiKeyHeaderValue, scope, command, mimeType, filename, ...mainFormValues } = this.entityForm.getRawValue();
    const isHeader = apiKeyType === 'X-API-Key' && apiKeyKeyName && apiKeyHeaderValue;
    const isCookie = apiKeyType === 'Cookie' && apiKeyKeyName && apiKeyHeaderValue;
    const isQueryParam = apiKeyType === 'QueryParam' && apiKeyKeyName && apiKeyHeaderValue;
    let headers: Record<string, string> | null = null;
    if (isHeader) {
      headers = { [apiKeyKeyName]: apiKeyHeaderValue };
    } else if (isCookie) {
      headers = { 'Cookie': `${apiKeyKeyName}=${apiKeyHeaderValue}` };
    }
    const queryParams = isQueryParam ? { [apiKeyKeyName]: apiKeyHeaderValue } : null;
    safeToEdit = Object.assign(safeToEdit,
      mainFormValues,
      {
        id: id,
        properties: {
          ...(this.entityToEdit?.properties || {}),
          ...TaskPropertiesBuilder.from(this.entityToEdit.properties)
          .withScope(scope)
          .withCommand(command)
          .withMimeType(mimeType || null)
          .withFilename(filename || null)
          .withAuthenticationMode(authenticationMode || null)
          .withUser(user || null)
          .withPassword(password || null)
          .withApiKeyType(apiKeyType || null)
          .withHeaders(headers)
          .withQueryParams(queryParams)
          .build(),
        }
      }
    );
    return Task.fromObject(safeToEdit);
  }

  /**
   * Handles scope type change events from the dropdown selection.
   * Updates form field availability based on the selected scope.
   *
   * @param event - Select change event containing the new scope value
   */
  onTypeChange(event: MatSelectChange) {
    this.configureForm(event.value)
  }

  /**
   * Configures form field availability based on the selected query scope.
   * - SQL Query: Enables command and connection, disables cartography
   * - Cartography Query: Enables cartography, disables command and connection
   * - Web API Query: Enables command, disables connection and cartography
   *
   * @param value - The selected scope value
   */
  configureForm(value: string | null | undefined) {
    if (value == null || value === '') {
      return;
    }
    const scope = this.codeValues?.queryTaskScope;

    // Sweep and reset provided flags when changing to non-proxied scopes
    const isDirectScope = value === scope?.webApiQueryNoProxy || value === scope?.urlQuery;
    if (isDirectScope) {
      this.clearProvidedParametersForDirectScope(value);
    }
    if (value === scope?.sqlQuery) {
      this.entityForm.get('command').enable({ emitEvent: false });
      this.entityForm.get('connectionId').enable({ emitEvent: false });
      this.entityForm.get('cartographyId').setValue(null);
      this.entityForm.get('cartographyId').disable({ emitEvent: false });
      this.entityForm.get('authenticationMode')?.setValue(null);
      this.entityForm.get('authenticationMode')?.disable({ emitEvent: false });
      this.entityForm.get('user')?.setValue(null);
      this.entityForm.get('user')?.disable({ emitEvent: false });
      this.entityForm.get('password')?.setValue(null);
      this.entityForm.get('password')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyType')?.setValue(null);
      this.entityForm.get('apiKeyType')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyKeyName')?.setValue(null);
      this.entityForm.get('apiKeyKeyName')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyHeaderValue')?.setValue(null);
      this.entityForm.get('apiKeyHeaderValue')?.disable({ emitEvent: false });
      this.entityForm.get('mimeType')?.setValue(null);
      this.entityForm.get('mimeType')?.disable({ emitEvent: false });
      this.entityForm.get('filename')?.setValue(null);
      this.entityForm.get('filename')?.disable({ emitEvent: false });
      this.deriveSqlRequiredOnRows();
    } else if (value === scope?.cartographyQuery) {
      this.entityForm.get('command').setValue(null);
      this.entityForm.get('command').disable({ emitEvent: false });
      this.entityForm.get('connectionId').setValue(null);
      this.entityForm.get('connectionId').disable({ emitEvent: false });
      this.entityForm.get('cartographyId').enable({ emitEvent: false });
      this.entityForm.get('authenticationMode')?.setValue(null);
      this.entityForm.get('authenticationMode')?.disable({ emitEvent: false });
      this.entityForm.get('user')?.setValue(null);
      this.entityForm.get('user')?.disable({ emitEvent: false });
      this.entityForm.get('password')?.setValue(null);
      this.entityForm.get('password')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyType')?.setValue(null);
      this.entityForm.get('apiKeyType')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyKeyName')?.setValue(null);
      this.entityForm.get('apiKeyKeyName')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyHeaderValue')?.setValue(null);
      this.entityForm.get('apiKeyHeaderValue')?.disable({ emitEvent: false });
      this.entityForm.get('mimeType')?.setValue(null);
      this.entityForm.get('mimeType')?.disable({ emitEvent: false });
      this.entityForm.get('filename')?.setValue(null);
      this.entityForm.get('filename')?.disable({ emitEvent: false });
    } else if (value === scope?.webApiQuery) {
      this.entityForm.get('command').enable({ emitEvent: false });
      this.entityForm.get('connectionId').setValue(null);
      this.entityForm.get('connectionId').disable({ emitEvent: false });
      this.entityForm.get('cartographyId').setValue(null);
      this.entityForm.get('cartographyId').disable({ emitEvent: false });
      this.entityForm.get('authenticationMode')?.enable({ emitEvent: false });
      this.entityForm.get('user')?.enable({ emitEvent: false });
      this.entityForm.get('password')?.enable({ emitEvent: false });
      this.entityForm.get('apiKeyType')?.enable({ emitEvent: false });
      this.entityForm.get('apiKeyKeyName')?.enable({ emitEvent: false });
      this.entityForm.get('apiKeyHeaderValue')?.enable({ emitEvent: false });
      this.entityForm.get('mimeType')?.enable({ emitEvent: false });
      this.entityForm.get('filename')?.enable({ emitEvent: false });
    } else if (value === scope?.webApiQueryNoProxy) {
      this.entityForm.get('command').enable({ emitEvent: false });
      this.entityForm.get('connectionId').setValue(null);
      this.entityForm.get('connectionId').disable({ emitEvent: false });
      this.entityForm.get('cartographyId').setValue(null);
      this.entityForm.get('cartographyId').disable({ emitEvent: false });
      this.entityForm.get('authenticationMode')?.setValue(null);
      this.entityForm.get('authenticationMode')?.disable({ emitEvent: false });
      this.entityForm.get('user')?.setValue(null);
      this.entityForm.get('user')?.disable({ emitEvent: false });
      this.entityForm.get('password')?.setValue(null);
      this.entityForm.get('password')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyType')?.setValue(null);
      this.entityForm.get('apiKeyType')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyKeyName')?.setValue(null);
      this.entityForm.get('apiKeyKeyName')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyHeaderValue')?.setValue(null);
      this.entityForm.get('apiKeyHeaderValue')?.disable({ emitEvent: false });
      this.entityForm.get('mimeType')?.enable({ emitEvent: false });
      this.entityForm.get('filename')?.enable({ emitEvent: false });
    } else if (value === scope?.urlQuery) {
      this.entityForm.get('command').enable({ emitEvent: false });
      this.entityForm.get('connectionId').setValue(null);
      this.entityForm.get('connectionId').disable({ emitEvent: false });
      this.entityForm.get('cartographyId').setValue(null);
      this.entityForm.get('cartographyId').disable({ emitEvent: false });
      this.entityForm.get('authenticationMode')?.setValue(null);
      this.entityForm.get('authenticationMode')?.disable({ emitEvent: false });
      this.entityForm.get('user')?.setValue(null);
      this.entityForm.get('user')?.disable({ emitEvent: false });
      this.entityForm.get('password')?.setValue(null);
      this.entityForm.get('password')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyType')?.setValue(null);
      this.entityForm.get('apiKeyType')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyKeyName')?.setValue(null);
      this.entityForm.get('apiKeyKeyName')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyHeaderValue')?.setValue(null);
      this.entityForm.get('apiKeyHeaderValue')?.disable({ emitEvent: false });
      this.entityForm.get('mimeType')?.setValue(null);
      this.entityForm.get('mimeType')?.disable({ emitEvent: false });
      this.entityForm.get('filename')?.setValue(null);
      this.entityForm.get('filename')?.disable({ emitEvent: false });
    } else {
      console.error(`Unknown task query scope type: ${value}. Expected one of: sql-query, cartography-query, web-api-query, web-api-query-no-proxy, external-link`);
      this.entityForm.get('command').setValue(null);
      this.entityForm.get('command').disable({ emitEvent: false });
      this.entityForm.get('connectionId').setValue(null);
      this.entityForm.get('connectionId').disable({ emitEvent: false });
      this.entityForm.get('cartographyId').setValue(null);
      this.entityForm.get('cartographyId').disable({ emitEvent: false });
      this.entityForm.get('authenticationMode')?.setValue(null);
      this.entityForm.get('authenticationMode')?.disable({ emitEvent: false });
      this.entityForm.get('user')?.setValue(null);
      this.entityForm.get('user')?.disable({ emitEvent: false });
      this.entityForm.get('password')?.setValue(null);
      this.entityForm.get('password')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyType')?.setValue(null);
      this.entityForm.get('apiKeyType')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyKeyName')?.setValue(null);
      this.entityForm.get('apiKeyKeyName')?.disable({ emitEvent: false });
      this.entityForm.get('apiKeyHeaderValue')?.setValue(null);
      this.entityForm.get('apiKeyHeaderValue')?.disable({ emitEvent: false });
      this.entityForm.get('mimeType')?.setValue(null);
      this.entityForm.get('mimeType')?.disable({ emitEvent: false });
      this.entityForm.get('filename')?.setValue(null);
      this.entityForm.get('filename')?.disable({ emitEvent: false });
    }
  }

  /**
   * Creates a new task entity in the database.
   * Also sets immutable relationships to task type and group.
   *
   * @returns Promise resolving to the ID of the created entity
   */
  override async createEntity(): Promise<number> {
    const entityToCreate = this.createObject();
    const entityCreated = await firstValueFrom(this.taskService.create(entityToCreate));
    // Set immutable relationship
    await firstValueFrom(entityCreated.updateRelationEx("type", this.taskType));
    const proxyGroup = this.taskGroupService.createProxy(this.entityForm.get('taskGroupId')?.value);
    await firstValueFrom(entityCreated.updateRelationEx("group", proxyGroup));
    return entityCreated.id;
  }

  /**
   * Updates an existing task entity with form values.
   *
   * @returns Promise that resolves when the update is complete
   */
  override async updateEntity() {
    const entityToUpdate = this.createObject(this.entityID);
    await firstValueFrom(this.taskService.update(entityToUpdate));
    if (this.entityForm.get('taskGroupId')?.dirty) {
      const proxyGroup = this.taskGroupService.createProxy(this.entityForm.get('taskGroupId')?.value);
      await firstValueFrom(entityToUpdate.updateRelationEx("group", proxyGroup));
    }
  }

  /**
   * Updates related data after the task is saved.
   * Updates translations and manages connection and cartography relationships.
   *
   * @param _isDuplicated - Whether this is a duplication operation
   * @returns Promise that resolves when related data is updated
   */
  override async updateDataRelated(_isDuplicated: boolean) {
    await this.saveTranslations(this.entityToEdit);
    const connectionId = this.entityForm.get('connectionId')?.value
    if (typeof connectionId === 'number') {
      await firstValueFrom(this.entityToEdit.updateRelationEx("connection", this.connectionService.createProxy(connectionId)));
    } else {
      await firstValueFrom(this.entityToEdit.deleteAllRelation("connection"));
    }
    const cartographyId = this.entityForm.get('cartographyId')?.value
    if (typeof cartographyId === 'number') {
      await firstValueFrom(this.entityToEdit.updateRelationEx("cartography", this.cartographyService.createProxy(cartographyId)));
    } else {
      await firstValueFrom(this.entityToEdit.deleteAllRelation("cartography"));
    }
  }

  override canSave(): boolean {
    return this.sqlSaveAllowed(super.canSave());
  }

  override get canSaveEntity(): boolean {
    return this.sqlSaveAllowed(super.canSaveEntity);
  }

  ngAfterViewChecked(): void {
    if (!this.entityForm || !this.codeValues?.queryTaskScope) {
      return;
    }
    if (!this.isSqlQueryScope()) {
      this.sqlEditorView?.destroy();
      this.sqlEditorView = null;
      return;
    }
    if (this.sqlEditorHost && !this.sqlEditorView) {
      this.mountSqlEditor();
    }
    if (this.pendingRunEditors) {
      const hosts = document.querySelectorAll<HTMLElement>('[data-sql-run]');
      if (hosts.length > 0) {
        this.mountRunEditors(hosts);
      }
      const expected = this.sqlTestResult?.runs?.length ?? 0;
      if (expected > 0 && hosts.length >= expected) {
        this.pendingRunEditors = false;
      }
    }
  }

  protected get customWarningMessage(): string {
    const missingParameters = this.getMissingCommandParameterNames();
    if (missingParameters.length === 0) {
      return '';
    }

    return this.translateService.instant('entity.task.query.missingDeclaredParameters', {
      parameters: missingParameters.join(', '),
    });
  }

  /**
   * Defines the data table configuration for managing roles.
   * Sets up columns, data fetching, updating logic, and target selection.
   *
   * @returns Configured data table definition for roles
   */
  private defineRolesTable(): DataTableDefinition<Role, Role> {
    return DataTableDefinition.builder<Role, Role>(this.dialog, this.errorHandler, this.loadingService)
      .withRelationsColumns([
        this.utils.getSelCheckboxColumnDef(),
        this.utils.getRouterLinkColumnDef(
          'common.form.name',
          'name',
          '/role/:id/roleForm',
          {
            id: 'id',
          }
        ),
        this.utils.getNonEditableColumnDef('common.form.description', 'description'),
        this.utils.getStatusColumnDef()
      ])
      .withRelationsOrder('name')
      .withRelationsFetcher(() => {
        if (this.isNew()) {
          return of([]);
        }
        return this.entityToEdit.getRelationArrayEx(Role, 'roles', {projection: 'view'})
      })
      .withRelationsUpdater(async (roles: (Role & Status)[]) => {
        await onUpdatedRelation(roles).forAll(item => this.entityToEdit.substituteAllRelation('roles', item));
      })
      .withTargetsColumns([
        this.utils.getSelCheckboxColumnDef(),
        this.utils.getNonEditableColumnDef('common.form.name', 'name'),
        this.utils.getNonEditableColumnDef('common.form.description', 'description'),
      ])
      .withTargetsOrder('name')
      .withTargetsFetcher(() => this.roleService.fetchAllItems())
      .withTargetToRelation((items) => items)
      .withTargetsTitle('entity.task.roles.title')
      .build();
  }

  /**
   * Defines the data table configuration for managing task availabilities.
   * Sets up columns, data fetching, updating logic, and target selection.
   *
   * @returns Configured data table definition for availabilities
   */
  private defineAvailabilitiesTable(): DataTableDefinition<TaskAvailabilityProjection, TerritoryProjection> {
    return DataTableDefinition.builder<TaskAvailabilityProjection, TerritoryProjection>(this.dialog, this.errorHandler, this.loadingService)
      .withRelationsColumns([
        this.utils.getSelCheckboxColumnDef(),
        this.utils.getRouterLinkColumnDef(
          'common.form.name',
          'territoryName',
          '/territory/:id/territoryForm',
          {
            id: 'territoryId',
          }
        ),
        this.utils.getNonEditableColumnDef('common.form.code', 'territoryCode'),
        this.utils.getNonEditableColumnDef('common.form.type', 'territoryTypeName'),
        this.utils.getNonEditableDateColumnDef('common.form.created', 'createdDate'),
        this.utils.getStatusColumnDef()
      ])
      .withRelationsOrder('territoryName')
      .withRelationsFetcher(() => {
        if (!this.isNew()) {
          return this.entityToEdit.getRelationArrayEx(TaskAvailabilityProjection, 'availabilities', {projection: 'view'})
        }
        return of([]);
      })
      .withRelationsUpdater(async (availabilities: (TaskAvailabilityProjection & Status)[]) => {
        await onDelete(availabilities).forEach(item => this.taskAvailabilityService.delete(this.taskAvailabilityService.createProxy(item.id)));
        await onCreate(availabilities)
          .map(item => TaskAvailability.of(this.taskService.createProxy(this.entityID), this.territoryService.createProxy(item.territoryId)))
          .forEach(item => this.taskAvailabilityService.create(item));
        availabilities.forEach(item => item.newItem = false);
      })
      .withTargetsColumns([
        this.utils.getSelCheckboxColumnDef(),
        this.utils.getNonEditableColumnDef('common.form.name', 'name'),
        this.utils.getNonEditableColumnDef('common.form.code', 'code'),
        this.utils.getNonEditableColumnDef('common.form.type', 'typeName'),
      ])
      .withTargetsOrder('name')
      .withTargetsFetcher(() => this.territoryService.fetchProjectionItems(TerritoryProjection))
      .withTargetInclude((availabilities: (TaskAvailabilityProjection)[]) => (item: TerritoryProjection) => {
        return !availabilities.some((availability) => availability.territoryId === item.id);
      })
      .withTargetToRelation((items: TerritoryProjection[]) => {
        return items.map(item => TaskAvailabilityProjection.of(this.entityToEdit, item));
      })
      .withTargetsTitle('entity.task.territories.title')
      .withTargetsOrder('name')
      .build();
  }

  /**
   * Defines the data table configuration for managing task parameters.
   * Sets up columns, data fetching, updating logic, and dialog templates.
   *
   * @returns Configured data table definition for parameters
   */
  private defineParametersTable(): DataTableDefinition<TaskQueryParameter, TaskQueryParameter> {
    return DataTableDefinition.builder<TaskQueryParameter, TaskQueryParameter>(this.dialog, this.errorHandler, this.loadingService)
      .withRelationsColumns([
        this.utils.getSelCheckboxColumnDef(),
        this.sqlParameterNameColumn(),
        this.utils.getEditableColumnDef('common.form.label', 'label'),
        this.utils.getNonEditableColumnDef('common.form.value', 'value'),
        this.utils.getNonEditableColumnWithCodeListDef('common.form.type', 'type', () => this.codeList('queryTask.parameterType')),
        this.sqlParameterDataTypeColumn(),
        this.sqlParameterRequiredColumn(),
        this.sqlParameterOptionalColumn(),
        this.utils.addConditionToColumnDef(this.utils.getBooleanColumnDef('entity.task.parameters.provided', 'provided', false), (params) => params.data.type === TaskParameterType.QUERY),
        this.sqlParameterWhenBlankColumn(),
        this.utils.getStatusColumnDef()])
      .withRelationsOrder('name')
      .withRelationsFetcher(() => {
        const originalParameters = TaskPropertiesContract.getParameters(this.entityToEdit?.properties);
        if (originalParameters.length > 0) {
          const parameters = originalParameters.map((parameter) => {
            const row = TaskQueryParameter.fromObject(parameter);
            this.applyDerivedRequired(row as unknown as Record<string, unknown>);
            return row;
          });
          return of(parameters);
        }
        return of<TaskQueryParameter[]>([])
      })
      .withRelationsUpdater(async (parameters: (TaskQueryParameter & Status)[]) => {
        const parametersToSave = parameters
          .filter(canKeepOrUpdate)
          .map(value => TaskQueryParameter.fromObject(value));
        this.entityToEdit.properties = TaskPropertiesContract.withParameters(this.entityToEdit.properties, parametersToSave);
        await firstValueFrom(this.taskService.update(this.entityToEdit));
      })
      .withFieldRestriction('name')
      .withTemplateDialog('newParameterDialog', () => TemplateDialog.builder()
        .withReference(this.newParameterDialog)
        .withTitle('entity.task.parameters.title')
        .withForm(this.newParameterForm())
        .withPreOpenFunction((form: FormGroup) => {
          const defaultType = this.defaultValueOrNull('queryTask.parameterType');
          form.reset({
            name: '',
            label: '',
            value: '',
            type: this.isSqlQueryScope() ? TaskParameterType.QUERY : (defaultType?.value || null),
            required: false,
            provided: false,
            optional: false,
            dataType: 'string',
          });
        }).build())
      .withTargetToRelation((items: TaskQueryParameter[]) => items.map(item => this.parameterFromDialog(item)))
      .withRelationsDuplicate(item => TaskQueryParameter.fromObject(item))
      .build();
  }

  private sqlParameterNameColumn() {
    const column = this.utils.getEditableColumnDef('common.form.name', 'name');
    (column as { editable: boolean | (() => boolean) }).editable = () => !this.isSqlQueryScope();
    return column;
  }

  private sqlParameterDataTypeColumn() {
    return this.utils.addConditionToColumnDef(
      this.utils.getNonEditableColumnDef('entity.task.query.dataType', 'dataType'),
      (params) => params.data?.type === TaskParameterType.QUERY
    );
  }

  private sqlParameterRequiredColumn() {
    return this.utils.addConditionToColumnDef(
      this.utils.getBooleanColumnDef(
        'common.form.required',
        'required',
        (params) => params.data?.type === 'query' && !this.isSqlQueryScope()
      ),
      (params) => params.data?.type === TaskParameterType.QUERY
    );
  }

  private sqlParameterOptionalColumn() {
    const column = this.utils.addConditionToColumnDef(
      this.utils.getBooleanColumnDef('entity.task.query.optional', 'optional', true),
      (params) => params.data?.type === TaskParameterType.QUERY
    );
    column.onCellValueChanged = (params) => {
      this.applyDerivedRequired(params.data);
      params.api?.refreshCells();
    };
    return column;
  }

  private sqlParameterWhenBlankColumn() {
    const column = this.utils.addConditionToColumnDef(
      this.utils.getNonEditableColumnDef('entity.task.query.whenBlank', 'whenBlank'),
      (params) => params.data?.type === TaskParameterType.QUERY
    );
    column.valueGetter = (params) => this.whenBlankText(params?.data);
    return column;
  }

  private whenBlankText(parameter: Record<string, unknown> | null | undefined): string {
    if (!parameter || parameter['type'] !== TaskParameterType.QUERY) {
      return '';
    }
    const value = typeof parameter['value'] === 'string' ? parameter['value'] : String(parameter['value'] ?? '');
    if (parameter['provided'] === true || value.trim() !== '') {
      return this.translateService.instant('entity.task.query.blank.provided');
    }
    if (parameter['optional'] === true) {
      return this.translateService.instant('entity.task.query.blank.null');
    }
    return this.translateService.instant('entity.task.query.blank.required');
  }

  private applyDerivedRequired(parameter: Record<string, unknown>): void {
    if (!parameter || !this.codeValues?.queryTaskScope || !this.isSqlQueryScope()) {
      return;
    }
    if (parameter['type'] !== TaskParameterType.QUERY) {
      return;
    }
    const value = typeof parameter['value'] === 'string' ? parameter['value'] : String(parameter['value'] ?? '');
    parameter['required'] = parameter['provided'] !== true && value.trim() === '' && parameter['optional'] !== true;
  }

  private deriveSqlRequiredOnRows(): void {
    if (!this.codeValues?.queryTaskScope || !this.isSqlQueryScope()) {
      return;
    }
    this.ensureSqlParameters().forEach((parameter) => this.applyDerivedRequired(parameter));
    const gridApi = this.parametersGrid?.dataGrid?.gridApi;
    if (gridApi && !gridApi.isDestroyed?.()) {
      gridApi.refreshCells();
    }
  }

  private newParameterForm(): FormGroup {
    const form = new FormGroup({
      name: new FormControl('', {
        validators: [Validators.required, (control: AbstractControl) => this.validateSqlParameterName(control)],
        nonNullable: true
      }),
      label: new FormControl('', {
        validators: [Validators.required],
        nonNullable: true
      }),
      value: new FormControl('', {
        validators: [(control: AbstractControl) => this.validateSqlParameterValue(control)],
        nonNullable: true
      }),
      type: new FormControl<string | null>(null, {
        validators: [Validators.required]
      }),
      required: new FormControl(false, { nonNullable: true }),
      provided: new FormControl(false, { nonNullable: true }),
      optional: new FormControl(false, { nonNullable: true }),
      dataType: new FormControl('string', { nonNullable: true }),
    });
    const value = form.get('value');
    form.get('provided')?.valueChanges.subscribe(() => value?.updateValueAndValidity({ emitEvent: false }));
    form.get('optional')?.valueChanges.subscribe(() => value?.updateValueAndValidity({ emitEvent: false }));
    return form;
  }

  private validateSqlParameterName(control: AbstractControl): ValidationErrors | null {
    if (!this.codeValues?.queryTaskScope || !this.isSqlQueryScope()) {
      return null;
    }
    const name = typeof control.value === 'string' ? control.value : '';
    if (name.trim() === '') {
      return null;
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      return { invalidName: true };
    }
    if (name.toLowerCase() === 'limit' || name.toLowerCase() === 'offset') {
      return { reserved: true };
    }
    for (const key of this.systemVariables.keys()) {
      if (key.toLowerCase() === name.toLowerCase()) {
        return { systemName: true };
      }
    }
    const trimmed = name.trim();
    if (this.ensureSqlParameters().some((parameter) => this.parameterName(parameter) === trimmed)) {
      return { duplicate: true };
    }
    return null;
  }

  private validateSqlParameterValue(control: AbstractControl): ValidationErrors | null {
    if (!this.codeValues?.queryTaskScope || !this.isSqlQueryScope()) {
      return null;
    }
    const value = typeof control.value === 'string' ? control.value : String(control.value ?? '');
    if (value.includes('#{')) {
      return { noSystemExpression: true };
    }
    const provided = control.parent?.get('provided')?.value === true;
    const optional = control.parent?.get('optional')?.value === true;
    if (provided && value.trim() === '') {
      return { providedNeedsValue: true };
    }
    if (optional && value.trim() !== '') {
      return { optionalHasValue: true };
    }
    return null;
  }

  protected parameterFromDialog(item: TaskQueryParameter): TaskQueryParameter {
    if (this.codeValues?.queryTaskScope && this.isSqlQueryScope()) {
      const draft: Record<string, unknown> = { ...item, type: TaskParameterType.QUERY };
      this.applyDerivedRequired(draft);
      return TaskQueryParameter.fromObject(draft);
    }
    return TaskQueryParameter.fromObject(item);
  }

  getTaskGroupName(taskGroupId: number): string {
      return this.taskGroupList.find(group => group.id === taskGroupId)?.name || '';
  }

  /**
   * Checks if the current task scope allows provided parameters.
   * Provided parameters (backend-only variables) are only supported for proxied scopes.
   * @returns true if scope is sql-query, web-api-query, or cartography-query; false otherwise
   */
  protected canHaveProvidedParameters(): boolean {
    const scope = this.entityForm?.get('scope')?.value;
    if (!scope) {
      return false;
    }
    const scopeValues = this.codeValues?.queryTaskScope;
    return scope === scopeValues?.sqlQuery
      || scope === scopeValues?.webApiQuery
      || scope === scopeValues?.cartographyQuery;
  }

  private getMissingCommandParameterNames(): string[] {
    const declaredParameters = new Set(this.getCurrentParameters()
      .map((parameter) => this.parameterName(parameter))
      .filter((parameterName) => parameterName.length > 0));

    return Array.from(this.extractCommandPlaceholders())
      .filter((parameterName) => !declaredParameters.has(parameterName))
      .sort((left, right) => compareNullableString(left, right));
  }

  private extractCommandPlaceholders(): Set<string> {
    const command = String(this.entityForm?.get('command')?.value || '');
    const placeholders = new Set<string>();

    for (const match of command.matchAll(TaskQueryFormComponent.COMMAND_PLACEHOLDER_PATTERN)) {
      const prefix = match[1];
      const parameterName = match[2]?.trim();
      if (prefix === '#' || !parameterName) {
        continue;
      }
      placeholders.add(parameterName);
    }

    return placeholders;
  }

  private getCurrentParameters(): Record<string, unknown>[] {
    if (this.codeValues?.queryTaskScope && this.isSqlQueryScope()) {
      return this.ensureSqlParameters().filter((parameter) => parameter['status'] !== 'pendingDelete');
    }
    const gridRows = this.parametersGrid?.getAllCurrentData?.() ?? this.parametersGrid?.rowData;
    if (Array.isArray(gridRows)) {
      return gridRows.filter((parameter) => parameter?.status !== 'pendingDelete');
    }

    return TaskPropertiesContract.getParameters(this.entityToEdit?.properties);
  }

  private clearProvidedParametersForDirectScope(scope: string): void {
    const parameters = this.getCurrentParameters();
    let hadProvidedParams = false;

    parameters.forEach((parameter) => {
      if (parameter['provided'] === true) {
        parameter['provided'] = false;
        hadProvidedParams = true;
      }
    });

    if (hadProvidedParams) {
      this.entityToEdit.properties = TaskPropertiesContract.withParameters(this.entityToEdit.properties, parameters);
      console.warn(`Scope changed to ${scope}. All provided parameters have been reset to false (direct-execution scopes do not support backend variables).`);
    }
  }

  protected parameterName(parameter: Record<string, unknown>): string {
    const value = parameter['name'] ?? parameter['variable'] ?? parameter['label'];
    return typeof value === 'string' ? value.trim() : '';
  }

  private sqlSaveAllowed(base: boolean): boolean {
    const allowed = base && this.getMissingCommandParameterNames().length === 0;
    if (!this.codeValues?.queryTaskScope || !this.isSqlQueryScope()) {
      return allowed;
    }
    return allowed && this.passedFingerprint !== '' && this.passedFingerprint === this.sqlFingerprint();
  }

  protected ensureSqlParameters(): Array<Record<string, unknown>> {
    const fromGrid = this.sqlParametersFromGrid();
    if (fromGrid !== null) {
      return fromGrid;
    }
    if (!this.sqlParameters) {
      this.sqlParameters = TaskPropertiesContract.getParameters(this.entityToEdit?.properties).map((parameter) => ({
        ...parameter
      }));
    }
    return this.sqlParameters.filter((parameter) => parameter['status'] !== 'pendingDelete');
  }

  protected onFormTabChange(event: MatTabChangeEvent): void {
    if (event.index !== 0 || !this.codeValues?.queryTaskScope || !this.isSqlQueryScope()) {
      return;
    }
    this.refreshSqlDecorations();
  }

  private sqlParametersFromGrid(): Array<Record<string, unknown>> | null {
    const grid = this.parametersGrid;
    const dataGrid = grid?.dataGrid;
    if (!grid || !dataGrid) {
      return null;
    }
    const gridApi = dataGrid.gridApi;
    const rows = gridApi && !gridApi.isDestroyed?.()
      ? grid.getAllCurrentData()
      : dataGrid.rowData;
    if (!Array.isArray(rows)) {
      return null;
    }
    return rows.filter((parameter) => parameter?.status !== 'pendingDelete');
  }

  protected sqlClientParameters(): Array<Record<string, unknown>> {
    return this.ensureSqlParameters().filter((parameter) => parameter['provided'] !== true);
  }

  protected sqlProvidedParameters(): Array<Record<string, unknown>> {
    return this.ensureSqlParameters().filter((parameter) => parameter['provided'] === true);
  }

  protected sqlSystemNames(): string[] {
    const names = new Set<string>();
    for (const placement of this.currentSqlScan().placements) {
      if (placement.kind === 'SYSTEM') {
        names.add(placement.name);
      }
    }
    return Array.from(names);
  }

  protected canTestSql(): boolean {
    return !!this.entityForm?.get('connectionId')?.value
      && this.currentSqlScan().violations.length === 0
      && this.getMissingCommandParameterNames().length === 0;
  }

  protected openSqlTest(): void {
    this.sqlTestError = '';
    this.sqlTestResult = null;
    this.testLimit = 10;
    this.testOffset = 0;
    this.testClientValues = {};
    this.testSystemValues = {};
    this.runGridColumns.clear();
    this.destroyRunEditors();
    this.sqlRunTab = 0;
    this.dialog.open(this.sqlTestDialog, {
      panelClass: ['formDialogs', 'sql-test-dialog-panel'],
      width: '800px',
      maxWidth: '90vw',
    });
  }

  protected async runSqlTest(): Promise<void> {
    const parameters = this.ensureSqlParameters().map((parameter) => ({
      ...parameter,
      required: parameter['provided'] !== true && !String(parameter['value'] ?? '').trim() && parameter['optional'] !== true
    }));
    this.sqlTestError = '';
    this.runGridColumns.clear();
    this.destroyRunEditors();
    try {
      this.sqlTestResult = await firstValueFrom(this.http.post<{ runs?: Array<Record<string, unknown>> }>(
        `${environment.apiBaseURL}/api/tasks/query/test`,
        {
          connectionId: this.entityForm.get('connectionId')?.value,
          sql: this.entityForm.get('command')?.value,
          parameters,
          clientValues: this.testClientValues,
          systemValues: this.testSystemValues,
          limit: Number(this.testLimit),
          offset: Number(this.testOffset)
        },
        { context: new HttpContext().set(SKIP_MESSAGES_INTERCEPTOR, true) }
      ));
      this.runGridColumns.clear();
      this.pendingRunEditors = true;
      const runs = this.sqlTestResult?.runs ?? [];
      if (runs.length === 2 && runs.every((run) => run['ok'] === true)) {
        this.passedFingerprint = this.sqlFingerprint();
      } else {
        this.passedFingerprint = '';
      }
    } catch (error) {
      this.passedFingerprint = '';
      this.sqlTestResult = null;
      this.sqlTestError = this.sqlTestFailureMessage(error);
    }
  }

  private sqlTestFailureMessage(error: unknown): string {
    const formatted = formatValidationErrors(error, (key) => this.translateService.instant(key));
    if (formatted) {
      return formatted;
    }
    return getErrorMessage(error);
  }

  protected formatSql(): void {
    const command = String(this.entityForm?.get('command')?.value ?? '');
    const formatted = format(command, {
      language: this.sqlFormatLanguage(),
      paramTypes: {
        custom: [
          { regex: String.raw`\$\{[A-Za-z_][A-Za-z0-9_]*\}` },
          { regex: String.raw`#\{[A-Za-z_][A-Za-z0-9_]*\}` }
        ]
      }
    });
    this.entityForm.get('command')?.setValue(formatted);
    this.sqlEditorView?.dispatch({
      changes: { from: 0, to: this.sqlEditorView.state.doc.length, insert: formatted }
    });
  }

  private readonly runGridColumns = new Map<string, ColDef[]>();
  private sqlValueColumnDefs: ColDef[] | null = null;

  protected runValues(run: Record<string, unknown>): unknown[] {
    return Array.isArray(run['values']) ? run['values'] as unknown[] : [];
  }

  protected runValueRows(run: Record<string, unknown>): Array<{ position: number; value: unknown }> {
    return this.runValues(run).map((value, index) => ({ position: index + 1, value }));
  }

  protected runValueColumnDefs(): ColDef[] {
    if (!this.sqlValueColumnDefs) {
      this.sqlValueColumnDefs = [
        {
          field: 'position',
          headerName: this.translateService.instant('entity.task.query.position'),
          width: 140,
          sortable: false
        },
        {
          field: 'value',
          headerName: this.translateService.instant('entity.task.query.boundValue'),
          flex: 1,
          sortable: false
        }
      ];
    }
    return this.sqlValueColumnDefs;
  }

  protected runRows(run: Record<string, unknown>): Record<string, unknown>[] {
    return Array.isArray(run['rows']) ? run['rows'] as Record<string, unknown>[] : [];
  }

  protected sqlRunTabLabel(index: number): string {
    const key = index === 0 ? 'entity.task.query.runAsWritten' : 'entity.task.query.runPaged';
    return this.translateService.instant(key);
  }

  protected onSqlRunTabChange(): void {
    this.pendingRunEditors = true;
    this.sqlRunEditors.forEach((view) => view.requestMeasure());
  }

  private destroyRunEditors(): void {
    this.sqlRunEditors.forEach((view) => view.destroy());
    this.sqlRunEditors = [];
    this.pendingRunEditors = false;
  }

  private mountRunEditors(hosts: NodeListOf<HTMLElement>): void {
    const liveHosts = new Set(hosts);
    this.sqlRunEditors = this.sqlRunEditors.filter((view) => {
      const parent = view.dom.parentElement;
      const attached = view.dom.isConnected && parent !== null && liveHosts.has(parent);
      if (!attached) {
        view.destroy();
      }
      return attached;
    });
    let created = false;
    hosts.forEach((host) => {
      if (host.querySelector('.cm-editor')) {
        return;
      }
      created = true;
      const label = host.getAttribute('data-sql-run');
      const run = (this.sqlTestResult?.runs ?? []).find((item) => item['label'] === label);
      const view = new EditorView({
        parent: host,
        state: EditorState.create({
          doc: String(run?.['sql'] ?? ''),
          extensions: [
            sql({ dialect: this.sqlDialect() }),
            EditorState.readOnly.of(true),
            EditorView.editable.of(false),
            ...this.sqlEditorChrome()
          ]
        })
      });
      this.sqlRunEditors.push(view);
    });
    if (created) {
      this.sqlRunEditors.forEach((view) => view.requestMeasure());
    }
  }

  protected runColumnDefs(run: Record<string, unknown>): ColDef[] {
    const label = String(run['label'] ?? '');
    const cached = this.runGridColumns.get(label);
    if (cached) {
      return cached;
    }
    const fields = new Set<string>();
    this.runRows(run).forEach((row) => Object.keys(row).forEach((field) => fields.add(field)));
    const columnDefs = Array.from(fields).map((field) => ({ field, sortable: true, resizable: true }));
    this.runGridColumns.set(label, columnDefs);
    return columnDefs;
  }

  private mountSqlEditor(): void {
    const parent = this.sqlEditorHost?.nativeElement;
    if (!parent) {
      return;
    }
    const decorate = (view: EditorView) => this.sqlDecorations(view);
    const refreshSqlMarks = TaskQueryFormComponent.refreshSqlMarks;
    const marks = ViewPlugin.fromClass(class {
      decorations = Decoration.none;
      constructor(view: EditorView) {
        this.decorations = decorate(view);
      }
      update(update: ViewUpdate) {
        const refresh = update.transactions.some((transaction) =>
          transaction.effects.some((effect) => effect.is(refreshSqlMarks)));
        if (update.docChanged || refresh) {
          this.decorations = decorate(update.view);
        }
      }
    }, { decorations: (value) => value.decorations });
    this.sqlEditorView = new EditorView({
      parent,
      state: EditorState.create({
        doc: String(this.entityForm?.get('command')?.value ?? ''),
        extensions: [
          sql({ dialect: this.sqlDialect() }),
          marks,
          ...this.sqlEditorChrome(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.entityForm.get('command')?.setValue(update.state.doc.toString());
              this.refreshSqlProblems();
            }
          })
        ]
      })
    });
    parent.closest('mat-form-field')?.querySelector('textarea')?.addEventListener('focus', () => {
      this.sqlEditorView?.focus();
    });
    this.refreshSqlProblems();
  }

  private sqlEditorChrome(): Extension[] {
    return [
      EditorView.lineWrapping,
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      EditorView.theme({
        '&': { backgroundColor: 'transparent' },
        '&.cm-focused': { outline: 'none' },
        '.cm-scroller, .cm-content': {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: '14px',
          lineHeight: '22px'
        },
        '.cm-content, .cm-line': { padding: '0' },
        '.cm-sql-placeholder, .cm-sql-placeholder span': { color: '#e65100' },
        '.cm-sql-invalid, .cm-sql-invalid span': { textDecoration: 'underline wavy #c62828' }
      }),
      EditorView.updateListener.of((update) => {
        if (!update.focusChanged) {
          return;
        }
        update.view.dom.closest('mat-form-field')?.classList.toggle('mat-focused', update.view.hasFocus);
      })
    ];
  }

  private sqlDecorations(view: EditorView) {
    const text = view.state.doc.toString();
    const scan = this.scanText(text);
    const invalid = scan.violations.filter((violation) => violation.start >= 0);
    const ranges = [];
    const invalidSpans = invalid.map((violation) => [violation.start, violation.end] as const);
    for (const placement of scan.placements) {
      const covered = invalidSpans.some(([start, end]) => placement.start < end && placement.end > start);
      if (!covered) {
        ranges.push(Decoration.mark({ class: 'cm-sql-placeholder' }).range(placement.start, placement.end));
      }
    }
    for (const violation of invalid) {
      ranges.push(Decoration.mark({ class: 'cm-sql-invalid' }).range(violation.start, Math.max(violation.end, violation.start + 1)));
    }
    return Decoration.set(ranges.sort((left, right) => left.from - right.from), true);
  }

  private refreshSqlDecorations(): void {
    this.sqlEditorView?.dispatch({ effects: TaskQueryFormComponent.refreshSqlMarks.of(null) });
    this.refreshSqlProblems();
  }

  private refreshSqlProblems(): void {
    this.sqlProblems = this.currentSqlScan().violations.map((violation) =>
      this.translateService.instant(`entity.task.query.violation.${violation.code}`, { name: violation.name ?? '' }));
  }

  private currentSqlScan(): SqlScan {
    return this.scanText(String(this.entityForm?.get('command')?.value ?? ''));
  }

  private scanText(sqlText: string): SqlScan {
    return scanSql(
      sqlText,
      this.ensureSqlParameters().map((parameter) => this.parameterName(parameter)),
      this.systemVariables.keys()
    );
  }

  private sqlFingerprint(): string {
    return JSON.stringify({
      sql: this.entityForm?.get('command')?.value ?? '',
      connectionId: this.entityForm?.get('connectionId')?.value ?? null,
      parameters: this.ensureSqlParameters().map((parameter) => ({
        name: this.parameterName(parameter),
        value: parameter['value'] ?? '',
        dataType: parameter['dataType'] ?? 'string',
        provided: parameter['provided'] === true,
        optional: parameter['optional'] === true
      }))
    });
  }

  private sqlDialect() {
    const driver = String(this.connections.find((item) => item.id === this.entityForm?.get('connectionId')?.value)?.driver ?? '');
    if (/postgres/i.test(driver)) {
      return PostgreSQL;
    }
    if (/sqlserver|microsoft/i.test(driver)) {
      return MSSQL;
    }
    return StandardSQL;
  }

  private sqlFormatLanguage(): 'postgresql' | 'transactsql' | 'sql' {
    const driver = String(this.connections.find((item) => item.id === this.entityForm?.get('connectionId')?.value)?.driver ?? '');
    if (/postgres/i.test(driver)) {
      return 'postgresql';
    }
    if (/sqlserver|microsoft/i.test(driver)) {
      return 'transactsql';
    }
    return 'sql';
  }
}
