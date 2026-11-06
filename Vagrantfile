# A throwaway Debian 13 VM for trying deploy/site.yml before using it on the
# real server. Needs Vagrant, a provider (VirtualBox or libvirt) and Ansible:
#   deploy/build-image.sh # builds the image the playbook uploads
#   vagrant up            # creates the VM and runs the playbook
#   vagrant provision     # runs the playbook again (e.g. to test updates)
#   open https://localhost:8443/admin   (self-signed certificate)
#   vagrant destroy

Vagrant.configure("2") do |config|
  config.vm.box = "debian/trixie64"
  config.vm.hostname = "santa-test"
  config.vm.network "forwarded_port", guest: 443, host: 8443, host_ip: "127.0.0.1"

  config.vm.provider "virtualbox" do |vb|
    vb.memory = 1024
  end
  config.vm.provider "libvirt" do |lv|
    lv.memory = 1024
  end

  config.vm.provision "ansible" do |ansible|
    ansible.playbook = "deploy/site.yml"
    ansible.config_file = "deploy/ansible.cfg"
    ansible.groups = { "santa" => ["default"] }
    ansible.extra_vars = {
      santa_domain: "localhost",
      santa_public_url: "https://localhost:8443",
      santa_tls_internal: true,
      santa_disable_ssh_passwords: false,
      santa_hosting_provider: "Test VM",
    }
  end
end
