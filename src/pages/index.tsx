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
      {/* Decorative layered background */}
      <div className={styles.heroBackground} aria-hidden="true">
        <div className={styles.heroGrid}></div>
        <div className={styles.glowOrb1}></div>
        <div className={styles.glowOrb2}></div>
        <div className={styles.glowOrb3}></div>
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className={styles.heroContent}>
          {/* Badge chip */}
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot}></span>
            系统化架构知识库
          </div>

          <Heading as="h1" className={styles.heroTitle}>
            <span className={styles.heroTitleLine1}>Ai</span>
            <span className={styles.heroTitleLine2}>Docs</span>
          </Heading>

          <p className={styles.heroSubtitle}>
            构建现代化的<span className={styles.highlightText}> 软件开发 </span>知识体系
            <br />
            <span className={styles.heroSubtitleSub}>深度原理 · 源码解析 · 实战沉淀</span>
          </p>

          <div className={styles.buttons}>
            <Link
              id="hero-cta-explore"
              className={clsx('button button--lg', styles.heroButtonPrimary)}
              to="/docs/">
              开始探索 →
            </Link>
            <Link
              id="hero-cta-github"
              className={clsx('button button--lg', styles.heroButtonGlass)}
              href="https://github.com/Aiden-Coding/AiDocs">
              <span className={styles.githubIcon}>⭐</span> GitHub
            </Link>
          </div>

          {/* Stats row */}
          <div className={styles.heroStats}>
            {[
              { value: '6+', label: '技术领域' },
              { value: '100+', label: '深度文章' },
              { value: '持续', label: '更新迭代' },
            ].map((stat) => (
              <div key={stat.label} className={styles.heroStat}>
                <span className={styles.heroStatValue}>{stat.value}</span>
                <span className={styles.heroStatLabel}>{stat.label}</span>
              </div>
            ))}
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
      description="AiDocs: 专注软件开发的系统化知识归纳与实战分享，涵盖 Java、数据库、分布式、Rust、React 等核心技术栈">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
