import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className={styles.heroBackground}>
        <div className={styles.heroGradient}></div>
        <div className={styles.heroPattern}></div>
      </div>
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className={styles.heroContent}>
          <Heading as="h1" className={styles.heroTitle}>
            AiDocs
          </Heading>
          <p className={styles.heroSubtitle}>
            构建现代化的<span className={styles.highlightText}>软件开发</span>知识库
          </p>
          <div className={styles.buttons}>
            <Link
              className={clsx('button button--primary button--lg', styles.heroButton)}
              to="/docs/intro">
              开始探索
            </Link>
            <Link
              className={clsx('button button--outline button--secondary button--lg', styles.heroButton, styles.heroButtonOutline)}
              href="https://github.com/dwx/AiDocs">
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`首页 - ${siteConfig.title}`}
      description="AiDocs: 专注软件开发的系统化知识归纳与实战分享">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
