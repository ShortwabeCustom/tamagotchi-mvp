module.exports = {
  apps: [
    {
      name: "bety",
      script: "/var/www/bety/bin/start-bety.sh",
      cwd: "/var/www/bety",
      interpreter: "/bin/bash",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      time: true
    }
  ]
};
