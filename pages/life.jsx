import Head from 'next/head';
import React, { PureComponent } from 'react';

import Game from '../components/game';

class Life extends PureComponent {
  render() {
    return (
      <div id="life">
        <Head>
          <title>life</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="life-main">
          <Game />
        </main>
      </div>
    );
  }
}

export default Life;
