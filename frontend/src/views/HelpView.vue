<template>
  <div class="simple-page">
    <el-page-header content="帮助说明" @back="$router.push('/app')" />
    <el-card shadow="never" class="simple-card markdown-card">
      <h2>当前版本说明</h2>
      <ul>
        <li>已经支持账号注册、登录、生成临时邮箱、查看邮件、修改系统设置、历史地址查看。</li>
        <li>如果 IMAP 已配置完整，工作台的“同步收件”会从真实收件箱拉取邮件。</li>
        <li>系统会尝试从 Cloudflare 转发保留的头信息中识别原始临时邮箱地址。</li>
      </ul>

      <h2>真实收件所需配置</h2>
      <ul>
        <li>IMAP_HOST</li>
        <li>IMAP_PORT</li>
        <li>IMAP_USERNAME</li>
        <li>IMAP_PASSWORD</li>
      </ul>

      <h2>注意</h2>
      <ul>
        <li>SMTP 只能发信，不能替代 IMAP 收件。</li>
        <li>如果修改转发目标邮箱，必须同步修改 Cloudflare 邮件转发规则。</li>
        <li>建议使用邮箱授权码，不要直接使用登录密码。</li>
      </ul>
    </el-card>
  </div>
</template>
