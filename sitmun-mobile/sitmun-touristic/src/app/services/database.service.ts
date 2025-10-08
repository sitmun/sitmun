import { Injectable } from '@angular/core';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { InstancesService } from './instances.service';
import { SQLiteService } from './sqlite.service';
import { Capacitor } from '@capacitor/core';

export interface Category {
  id: number,
  image: string,
  name: string
};

export interface Favorite {
  id_node: number,
  id_task: number,
  id_element: number,
  id_category: number,
  element: string
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private db: SQLiteDBConnection | null = null;
  private dbName: string = '';

  constructor(private instanceService: InstancesService, private sqlite: SQLiteService) {
  }

  private async loadConnection() {
    try {
      let isConnection = await this.sqlite.isConnection(this.dbName);
      if (isConnection.result) {
        console.log("Obteniendo conexion");
        this.db = await this.sqlite.retrieveConnection(this.dbName);
      } else {
        console.log("Creando conexion");
        this.db = await this.sqlite.createConnection(this.dbName, false, "no-encryption", 1);
        console.log("Abriendo conexion");
        await this.db.open();
      }
    } catch (error) {
      throw Error(`DatabaseServiceError: ${error}`);
    }
  }

  checkPlugin() {
    let available = true;
    if (!Capacitor.isPluginAvailable('CapacitorSQLite')) {
      available = false;
      console.error('CapacitorSQLite plugin no disponible');
    } else {
      console.log('CapacitorSQLite plugin disponible');
    }
    return available;
  }

  async initDatabase() {
    this.dbName = this.instanceService.instanceName + '.db';
    if (this.sqlite.getPlatform() !== 'web' && !this.checkPlugin()) {
      return;
    }
    try {
      if (this.sqlite.getPlatform() === 'web') {
        await this.sqlite.initializeWebStore();
      }
      await this.loadConnection();
      await this.createTables();
      await this.closeConnection();      
    } catch (error) {
      throw Error(`DatabaseServiceError: ${error}`);
    }
  }

  private async createTables(): Promise<void> {
    await this.createProfileTable();
    await this.createCategoriesTable();
    await this.createFavoritesTable();
    await this.createCacheTable();
  }

  private async createProfileTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS profile (
        name TEXT PRIMARY KEY,
        json TEXT
      );
    `;

    await this.createTableGeneric(createTableQuery, 'profile');
  }

  private async createCategoriesTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        image TEXT,
        name TEXT
      );
    `;

    await this.createTableGeneric(createTableQuery, 'catogories');
  }

  private async createFavoritesTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS favorites (
        id_node INTEGER,
        id_task INTEGER,
        id_element INTEGER,
        id_category INTEGER,
        element TEXT,
        visited BOOLEAN DEFAULT false,
        PRIMARY KEY (id_node, id_task, id_element)
      );
    `;

    await this.createTableGeneric(createTableQuery, 'favorites');
  }

  private async createCacheTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS cache (
        url TEXT,
        params TEXT,
        response TEXT,
        response_format TEXT,
        request_date NUMERIC,
        PRIMARY KEY (url, params)
      );
    `;

    await this.createTableGeneric(createTableQuery, 'cache');
  }

  async createTableGeneric(createTableQuery: string, tableName: string) {
    try {
      if(this.db) {
        console.log(`Creando tabla ${tableName}...`);
        const changes = await this.db.execute(createTableQuery);
        console.log(`Tabla ${tableName} creada correctamente`);
      } else {
        console.log("Conexion nula");
      }
    } catch (error) {
      console.error(`Error creando tabla ${tableName}:`, error);
    }
  }

  async addFavorite(category: Category, favorite: Favorite) {
    await this.loadConnection();
    await this.insertCategory(category);
    await this.insertFavorite(favorite);
    await this.closeConnection();
  }

  async addProfile(profile: any) {
    await this.loadConnection();
    await this.truncateProfileData();
    const keys = Object.keys(profile);
    for (let k of keys) {
      await this.insertProfileData(k, JSON.stringify(profile[k]));
    }
    await this.closeConnection();
  }

  private async truncateProfileData() {
    const statement = 'DELETE FROM profile';

    try {
      if (this.db) {
        await this.db.run(statement);
        console.log(`Tabla Profile truncada`);
      }
    } catch (error) {
      console.error('Error al truncar tabla profile', error);
    }
  }

  private async insertProfileData(name: string, json: string) {
    const statement = 'INSERT OR REPLACE INTO profile (name, json) VALUES (?, ?)';
    const values = [name, json];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`Profile ${name} agregado`);
      }
    } catch (error) {
      console.error('El profile ya existe');
    }
  }

  private async insertCategory(category: Category) {
    const statement = 'INSERT INTO categories VALUES (?, ?, ?)';
    const values = [category.id, category.image, category.name];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log('Categoria agregada');
      }
    } catch (error) {
      console.error('La categoría ya existe');
    }
  }

  private async insertFavorite(favorite: Favorite): Promise<void> {
    const statement = 'INSERT INTO favorites VALUES (?, ?, ?, ?, ?, ?)';
    const values = [favorite.id_node, favorite.id_task, favorite.id_element, favorite.id_category, favorite.element, false];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log('Favorito agregado');
      }
    } catch (error) {
      console.error('Error al agregar favorito:', error);
    }
  }

  async insertCacheData(url: string, params: string, response: string, responseFormat: string) {
    await this.loadConnection();
    const statement = `INSERT OR REPLACE INTO cache (url, params, response, response_format, request_date) VALUES (?, ?, ?, ?)`;
    const values = [url, params, response, responseFormat, new Date().getTime()];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`cache agregada`);
      }
    } catch (error) {
      console.error('Ya existe cache');
    } finally {
      await this.closeConnection();
    }
  }

  async getProfileData(type: string): Promise<any[]> {
    await this.loadConnection();
    const statement = 'SELECT * FROM profile WHERE name = ?';
    const values = [type];
    try {
      if (this.db) {
        const results = (await this.db.query(statement, values)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo profile:', error);
      return [];
    } finally {
      await this.closeConnection();
    }
  }

  async getCategories(): Promise<any[]> {
    await this.loadConnection();
    const statement = 'SELECT * FROM categories WHERE id IN (SELECT id_category FROM favorites)';

    try {
      if (this.db) {
        const results = (await this.db.query(statement)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo categorias:', error);
      return [];
    } finally {
      await this.closeConnection();
    }
  }

  async removeCategory(idCategory: number) {
    await this.loadConnection();
    const favStatement = 'DELETE FROM favorites WHERE id_category = ?';
    const catStatement = 'DELETE FROM categories WHERE id = ?';
    const values = [idCategory];

    try {
      if (this.db) {
        console.log('Eliminando favoritos de la categoria');
        (await this.db.run(favStatement, values)).changes;
        console.log('Eliminando categoria');
        (await this.db.run(catStatement, values)).changes;
      }
      console.log('Categoria eliminada');
    } catch (error) {
      console.error('Error al eliminar categoria:', error);
    } finally {
      await this.closeConnection();
    }
  }

  async getFavorites(idCategory: number): Promise<any[]> {
    await this.loadConnection();

    const statement = 'SELECT * FROM favorites where id_category = ?';
    const values = [idCategory];
    try {
      if (this.db) {
        const results = (await this.db.query(statement, values)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo favoritos:', error);
      return [];
    } finally {
      await this.closeConnection();
    }
  }

  async getAllFavorites(): Promise<any[]> {
    await this.loadConnection();

    const statement = 'SELECT * FROM favorites';
    try {
      if (this.db) {
        const results = (await this.db.query(statement)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo favoritos:', error);
      return [];
    } finally {
      await this.closeConnection();
    }
  }
  
  async removeFavorite(favorite: Favorite) {
    await this.loadConnection();
    const statement = 'DELETE FROM favorites WHERE id_node = ? AND id_task = ? AND id_element = ?';
    const values = [favorite.id_node, favorite.id_task, favorite.id_element];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log('Favorito eliminado');
      }
    } catch (error) {
      console.error('Error al eliminar favorito:', error);
    } finally {
      await this.closeConnection();
    }
  }

  async visitFavoriteChange(favorite: Favorite, visited: boolean) {
    await this.loadConnection();
    const statement = 'UPDATE favorites SET visited = ? WHERE id_node = ? AND id_task = ? AND id_element = ?';
    const values = [visited, favorite.id_node, favorite.id_task, favorite.id_element];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log('Favorito modificado');
      }
    } catch (error) {
      console.error('Error al modificar favorito:', error);
    } finally {
      await this.closeConnection();
    }
  }

  async isFavorite(favorite: Favorite): Promise<boolean> {
    await this.loadConnection();

    const statement = 'SELECT * FROM favorites WHERE id_node = ? AND id_task = ? AND id_element = ?';
    const values = [favorite.id_node, favorite.id_task, favorite.id_element];
    try {
      let isFav = false;
      if (this.db) {
        const result = (await this.db.query(statement, values)).values;
        isFav = result && result.length > 0 ? true : false;
      }
      return isFav;
    } catch (error) {
      console.error('Error obteniendo favorito:', error);
      return false;
    } finally {
      await this.closeConnection();
    }
  }

  async getCacheData(url: string, params: string): Promise<any[]> {
    await this.loadConnection();
    const statement = `SELECT response, response_format, request_date FROM cache WHERE url = ? and params = ?`;
    const values = [url, params];
    try {
      if (this.db) {
        const results = (await this.db.query(statement, values)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo cache:', error);
      return [];
    } finally {
      await this.closeConnection();
    }
  }

  async removeCache(url: string, params: string) {
    await this.loadConnection();
    const statement = 'DELETE FROM cache WHERE url = ? and params = ?';
    const values = [url, params];

    try {
      if (this.db) {
        console.log('Eliminando cache');
        (await this.db.run(statement, values)).changes;
      }
      console.log('Cache eliminada');
    } catch (error) {
      console.error('Error al eliminar cache:', error);
    } finally {
      await this.closeConnection();
    }
  }

  async closeConnection(): Promise<void> {
    await this.sqlite.closeConnection(this.dbName);
  }
}
