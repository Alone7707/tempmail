<template>
  <div class="shell-page shell-page-simple">
    <aside class="shell-sidebar">
      <div class="shell-brand-block">
        <div class="shell-brand-icon">∞</div>
        <div>
          <div class="shell-brand-title">无限邮箱</div>
          <div class="shell-brand-sub">Infinite Utility</div>
        </div>
      </div>
      <nav class="shell-nav">
        <RouterLink to="/app" class="shell-nav-link">工作台</RouterLink>
        <RouterLink to="/app/history" class="shell-nav-link">历史记录</RouterLink>
        <RouterLink to="/app/settings" class="shell-nav-link">配置设置</RouterLink>
        <RouterLink to="/app/help" class="shell-nav-link">帮助中心</RouterLink>
      </nav>
    </aside>

    <main class="shell-main">
      <header class="shell-topbar">
        <div class="shell-breadcrumb">帮助中心 / 文档</div>
      </header>

      <div class="shell-content shell-content-docs">
        <div class="docs-layout docs-layout-refined">
          <aside class="docs-nav">
            <section>
              <h3>核心指南</h3>
              <a href="#principles">产品原理</a>
              <a href="#workflow">使用流程</a>
              <a href="#config">配置说明</a>
            </section>
            <section>
              <h3>支持信息</h3>
              <a href="#faq">常见问题</a>
              <a href="#safety">安全与隐私</a>
            </section>
          </aside>

          <article class="docs-content">
            <section class="docs-hero docs-hero-refined">
              <div class="section-kicker">Knowledge Base</div>
              <h1>了解无限邮箱的<span>真实收件链路</span></h1>
              <p>
                这不是一个只会生成假地址的演示页面，而是一套把域名转发、真实邮箱、IMAP 同步和历史会话管理串起来的临时邮箱控制台。
                你可以维护多套收件配置，并按配置生成不同来源的临时邮箱。
              </p>
            </section>

            <section id="principles" class="docs-section">
              <div class="section-kicker">Principles</div>
              <h2>产品原理</h2>
              <div class="docs-card-grid">
                <div class="docs-info-card docs-info-card-rich">
                  <h3>Cloudflare 转发层</h3>
                  <p>外部邮件先进入你的域名邮箱规则，再被 Cloudflare 转发到某个真实邮箱。临时地址本身只是入口，真正收件落点仍是你的真实邮箱。</p>
                </div>
                <div class="docs-info-card docs-info-card-rich">
                  <h3>IMAP 拉取层</h3>
                  <p>系统通过 IMAP 访问真实邮箱，读取新邮件，再结合邮件头字段推断原始 alias，确保只展示属于当前临时邮箱的邮件。</p>
                </div>
              </div>
            </section>

            <section id="workflow" class="docs-section">
              <div class="section-kicker">Workflow</div>
              <h2>使用流程</h2>
              <ol class="docs-steps docs-steps-rich">
                <li>先在设置页新增至少一套邮箱配置，填好转发邮箱与 IMAP 参数。</li>
                <li>在 Cloudflare 中把域名邮箱转发到对应真实邮箱。</li>
                <li>回到工作台选择当前配置，再生成新的临时邮箱地址。</li>
                <li>收到外部邮件后，可以手动同步，也可以等待系统自动轮询。</li>
                <li>若要回看历史 alias，去历史页切换到对应邮箱会话即可。</li>
              </ol>
            </section>

            <section id="config" class="docs-section">
              <div class="section-kicker">Configuration</div>
              <h2>配置说明</h2>
              <div class="docs-code-card docs-code-card-rich">
                <div>IMAP_HOST</div>
                <div>IMAP_PORT</div>
                <div>IMAP_USERNAME</div>
                <div>IMAP_PASSWORD</div>
              </div>
              <p class="docs-tip">SMTP 只能发信，不能替代 IMAP 收件。真正收件同步必须依赖 IMAP。</p>
            </section>

            <section id="faq" class="docs-section">
              <div class="section-kicker">FAQ</div>
              <h2>常见问题</h2>
              <el-collapse class="docs-faq-collapse">
                <el-collapse-item title="为什么修改 forwardToEmail 后还是收不到邮件？" name="1">
                  因为域名的 Cloudflare 转发规则也必须同步修改，否则外部邮件仍会进入旧邮箱。
                </el-collapse-item>
                <el-collapse-item title="为什么系统不能只靠 SMTP 完成全部流程？" name="2">
                  SMTP 负责发信，不负责读取收件箱。只要你要“同步看到收到的邮件”，就必须接 IMAP 或等价收件 API。
                </el-collapse-item>
                <el-collapse-item title="支持多个邮箱配置吗？" name="3">
                  支持。现在可以添加、编辑、删除多个配置，并在工作台通过下拉框切换当前使用的配置。
                </el-collapse-item>
                <el-collapse-item title="切换历史邮箱会发生什么？" name="4">
                  当前邮箱、邮件列表和关联配置上下文都会一起切换，方便你回看旧地址收到的邮件。
                </el-collapse-item>
              </el-collapse>
            </section>

            <section id="safety" class="docs-section docs-footer-cta docs-footer-cta-refined">
              <h2>安全与隐私</h2>
              <p>建议始终使用邮箱授权码，而不是网页登录密码。敏感凭证只应保存在服务端配置中，不应出现在前端页面或公开日志中。</p>
            </section>
          </article>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
