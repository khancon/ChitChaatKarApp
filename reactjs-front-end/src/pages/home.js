import React, { Component } from 'react'
import axios from 'axios';
import Grid from '@material-ui/core/Grid';

class home extends Component {
    state = {
        chaats: null
    }
    componentDidMount(){
        axios.get('/chaats')
            .then(res => {
                console.log(res.data);
                this.setState({
                    chaats: res.data
                })
            })
            .catch(err => console.log(err));
    } //4:51:00
    render() {
        let recentChaatsMarkup = this.state.chaats ? (
            this.state.chaats.map(chaat => <p>{chaat.body}</p>)
        ) : <p>Loading...</p>
        return (
            <Grid container spacing={16}>
                <Grid item sm={8} xs={12}>
                    {recentChaatsMarkup}
                </Grid>
                <Grid item sm={4} xs={12}>
                    <p>Profile...</p>
                </Grid>
            </Grid>
        )
    }
}

export default home
