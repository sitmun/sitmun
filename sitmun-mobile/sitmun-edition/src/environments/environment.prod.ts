export const environment = {
  production: true,
  //instancesUrl: 'http://192.168.1.140:8888/instances', //casa
  //instancesUrl: 'http://192.168.60.173:8888/instances', //oficina
  instancesUrl: '',
  instancesData: {
    local: {
      name: 'Local',
      //urlBackend: 'http://localhost:9000/backend'
      urlBackend: 'http://192.168.1.140:8080'
    }
  }
};
