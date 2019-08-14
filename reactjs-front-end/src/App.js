import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import './App.css';
import MuiThemeProvider from '@material-ui/core/styles/MuiThemeProvider';
import createMuiTheme from '@material-ui/core/styles/createMuiTheme';
//Componenets
import Navbar from './components/Navbar'

//Pages
import home from'./pages/home'
import login from'./pages/login'
import signup from'./pages/signup'

const theme = createMuiTheme({
  palette: {
    primary: {
      light: '#c25f8d',
      main: '#b33771',
      dark: '#7d264f',
      contrastText: '#fff',
    },
    secondary: {
      light: '#fa9873',
      main: '#f97f51',
      dark: '#ae5838',
      contrastText: '#000',
    },
  },
});
function App() {
  return (
    <MuiThemeProvider theme={theme}>
      <div className="App">
      <Router>
        <Navbar/>
        <div className="container">
          <Switch>
            <Route exact path="/" component={home}/>
            <Route exact path="/login" component={login}/>
            <Route exact path="/signup" component={signup}/>
          </Switch>
        </div>
      </Router>
      </div>
    </MuiThemeProvider>
  );
}

//1. install material ui (npm install --save @material-ui/core)

export default App;
