import React, { Component } from 'react'
import axios from 'axios';
import Grid from '@material-ui/core/Grid';

import Chaat from '../components/Chaat';

class home extends Component {
    state = {
        chaats: null
    }
    componentDidMount(){
        axios.get('/chaats')
            .then(res => {
                this.setState({
                    chaats: res.data
                })
            })
            .catch(err => console.log(err));
    } //4:51:00
    render() {
        let recentChaatsMarkup = this.state.chaats ? (
            this.state.chaats.map(chaat => <Chaat key={chaat.chaatId} chaat={chaat}/>)
        ) : <p>Loading...</p>
        return (
            <Grid container spacing={2}>
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
