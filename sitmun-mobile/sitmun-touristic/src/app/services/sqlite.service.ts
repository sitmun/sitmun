import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteDBConnection,
  SQLiteConnection, capSQLiteResult,} from '@capacitor-community/sqlite';

@Injectable()

export class SQLiteService {
    sqlite: SQLiteConnection | null = null;
    isService: boolean = false;
    platform: string = '';
    sqlitePlugin: any;
    native: boolean = false;

    constructor() {
      this.initializePlugin();
    }
    /**
     * Plugin Initialization
     */
    initializePlugin() {
      this.platform = Capacitor.getPlatform();
      console.log("initializePlugin Platform: ", this.platform);
      if(this.platform === 'ios' || this.platform === 'android') {
        console.log('SQLite nativo');
        this.native = true;
      }
      this.sqlitePlugin = CapacitorSQLite;
      this.sqlite = new SQLiteConnection(this.sqlitePlugin);
      this.isService = true;
    }

    async initializeWebStore() {
      await this.sqlite?.initWebStore();
    }
    
    getPlatform() {
      return this.platform;
    }

    /**
     * Create a connection to a database
     * @param database
     * @param encrypted
     * @param mode
     * @param version
     */
    async createConnection(database:string, encrypted: boolean,
                           mode: string, version: number, readonly?: boolean
                           ): Promise<SQLiteDBConnection> {
      if(this.sqlite != null) {
        try {
          const readOnly = readonly ? readonly : false;
          const db: SQLiteDBConnection = await this.sqlite.createConnection(
                          database, encrypted, mode, version, readOnly);
          if (db != null) {
            return Promise.resolve(db);
          } else {
            return Promise.reject(new Error(`no db returned is null`));
          }
        } catch (err) {
          return Promise.reject(new Error(String(err)));
        }
      } else {
        return Promise.reject(new Error(`no connection open for ${database}`));
      }
    }

    /**
     * Close a connection to a database
     * @param database
     */
    async closeConnection(database:string, readonly?: boolean): Promise<void> {
      if(this.sqlite != null) {
        try {
          const readOnly = readonly ? readonly : false;
          await this.sqlite.closeConnection(database, readOnly);
          return Promise.resolve();
        } catch (err) {
          return Promise.reject(new Error(String(err)));
        }
      } else {
        return Promise.reject(new Error(`no connection open for ${database}`));
      }
    }

    /**
     * Retrieve an existing connection to a database
     * @param database
     */
    async retrieveConnection(database:string, readonly?: boolean):
            Promise<SQLiteDBConnection> {
      if(this.sqlite != null) {
        try {
          const readOnly = readonly ? readonly : false;
          return Promise.resolve(await this.sqlite.retrieveConnection(database, readOnly));
        } catch (err) {
          return Promise.reject(new Error(String(err)));
        }
      } else {
        return Promise.reject(new Error(`no connection open for ${database}`));
      }
    }

    /**
     * Retrieve all existing connections
     */
    async retrieveAllConnections():
                    Promise<Map<string, SQLiteDBConnection>> {
      if(this.sqlite != null) {
        try {
          const myConns =  await this.sqlite.retrieveAllConnections();
          let keys = [...myConns.keys()];
          keys.forEach( (value) => {
              console.log("Connection: " + value);
          });

          return Promise.resolve(myConns);
        } catch (err) {
          return Promise.reject(new Error(String(err)));
        }
      } else {
        return Promise.reject(new Error(`no connection open`));
      }
    }

    /**
     * Close all existing connections
     */
    async closeAllConnections(): Promise<void> {
      if(this.sqlite != null) {
        try {
            return Promise.resolve(await this.sqlite.closeAllConnections());
        } catch (err) {
            return Promise.reject(new Error(String(err)));
        }
      } else {
        return Promise.reject(new Error(`no connection open`));
      }
    }

    /**
     * Check if connection exists
     * @param database
     */
     async isConnection(database: string, readonly?: boolean): Promise<capSQLiteResult> {
      if(this.sqlite != null) {
        try {
          const readOnly = readonly ? readonly : false;
          return Promise.resolve(await this.sqlite.isConnection(database, readOnly));
        } catch (err) {
          return Promise.reject(new Error(String(err)));
        }
      } else {
        return Promise.reject(new Error(`no connection open`));
      }
    }
}