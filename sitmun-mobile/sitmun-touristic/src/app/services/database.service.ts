import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteDBConnection } from '@capacitor-community/sqlite';
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
  private dbName: string;

  constructor(private instanceService: InstancesService, private sqlite: SQLiteService) {
    this.dbName = instanceService.instanceName + '.db';
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
    if (!this.checkPlugin()) {
      return;
    }
    try {
      await this.loadConnection();
      await this.createTables();
      await this.sqlite.closeConnection(this.dbName);      
    } catch (error) {
      throw Error(`DatabaseServiceError: ${error}`);
    }
  }

  private async createTables(): Promise<void> {
    await this.createProfileTable();
    await this.createCategoriesTable();
    await this.createFavoritesTable();
  }

  private async createProfileTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS profile (
        name TEXT PRIMARY KEY,
        json TEXT
      );
    `;

    try {
      if(this.db) {
        console.log("Creando tabla profile...");
        const changes = await this.db.execute(createTableQuery);
        console.log('Tabla profile creada correctamente');
      } else {
        console.log("Conexion nula 1");
      }
    } catch (error) {
      console.error('Error creando tabla profile:', error);
    }
  }

  private async createCategoriesTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        image TEXT,
        name TEXT
      );
    `;

    try {
      if(this.db) {
        console.log("Creando tabla categories...");
        const changes = await this.db.execute(createTableQuery);
        console.log('Tabla categories creada correctamente');
      } else {
        console.log("Conexion nula 1");
      }
    } catch (error) {
      console.error('Error creando tabla categories:', error);
    }
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

    try {
      if(this.db) {
        console.log("Creando tabla favorites...");
        const changes = await this.db.execute(createTableQuery);
        console.log('Tabla favorites creada correctamente');
      } else {
        console.log("Conexion nula 2");
      }
    } catch (error) {
      console.error('Error creando tabla favorites:', error);
    }
  }

  async addFavorite(category: Category, favorite: Favorite) {
    await this.loadConnection();
    await this.insertCategory(category);
    await this.insertFavorite(favorite);
    await this.sqlite.closeConnection(this.dbName);
  }

  async addProfile(profile: any) {
    await this.loadConnection();
    await this.truncateProfileData();
    const keys = Object.keys(profile);
    for (let k of keys) {
      await this.insertProfileData(k, JSON.stringify(profile[k]));
    }
    await this.sqlite.closeConnection(this.dbName);
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
      await this.sqlite.closeConnection(this.dbName);
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
      await this.sqlite.closeConnection(this.dbName);
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
      await this.sqlite.closeConnection(this.dbName);
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
      await this.sqlite.closeConnection(this.dbName);
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
      await this.sqlite.closeConnection(this.dbName);
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
      await this.sqlite.closeConnection(this.dbName);
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
      await this.sqlite.closeConnection(this.dbName);
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
      await this.sqlite.closeConnection(this.dbName);
    }
  }

  async closeDatabase(): Promise<void> {
    await this.sqlite.closeConnection(this.dbName);
  }
}
