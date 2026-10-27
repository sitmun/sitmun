import { paths } from "jsonpath";

export const constants = {
    codeValue: {
        serviceType: {
            wms: 'WMS',
            wfs: 'WFS'
        },
        applicationType: {
            touristicApp: 'T',
            externalApp: 'E',
            internalApp: 'I'
        },
        treeType: {
            touristicTree: 'touristic',
            cartography: 'cartography'
        },
        treenodeFolderType: {
            menu: 'menu',
            list: 'list',
            cartography: 'cartography',
            map: 'map',
            favorites: 'fav',
            nearme: 'nm'
        },
        treenodeLeafType: {
            task: 'task',
            cartography: 'cartography',
        },
        taskViewMode: {
            detailedList: 'dl',
            nearElements: 'ne',
            schedule: 'sch',
            events: 'evt',
            eventsCategories: 'evtcat',
            eventsLocations: 'evtloc'
        }
    },
    paths: {
        menu: '/menu',
        list: '/list',
        fav: '/favorites',
        map: '/map',
        nm: '/nearme',
        task: {
            dl: '/detailedlist',
            rt: '/routes',
            ne: '/nearelements',
            sch: '/schedule',
            evt: '/events',
            evtcat: '/events',
            evtloc: '/events',
            gallery: '/gallery'
        }
    }
}