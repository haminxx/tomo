terraform {
  required_version = ">= 1.8"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 9.0"
    }
  }
}

# Local state only. This stack does not use a Google bucket or any other
# remote backend, so init does not touch a cloud account.

variable "region" {
  description = "OCI region. Ampere Always Free capacity is regional; us-phoenix-1 and us-ashburn-1 are common choices."
  type        = string
}

variable "compartment_ocid" {
  description = "Compartment OCID for the network and instance. Not a secret key."
  type        = string
}

variable "tenancy_ocid" {
  description = "Tenancy OCID. Not a secret key."
  type        = string
}

variable "user_ocid" {
  description = "API user OCID. Not a secret key."
  type        = string
}

variable "fingerprint" {
  description = "API signing key fingerprint. The private key stays on the machine that runs tofu."
  type        = string
}

variable "private_key_path" {
  description = "Path to the API private key on the machine that runs tofu. Never commit that key."
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key installed for the ubuntu user. Never commit a private key."
  type        = string
}

variable "domain" {
  description = "Public hostname for this computer. Caddy and the API read DOMAIN from the environment at runtime; this value is not written into Caddy."
  type        = string
}

variable "availability_domain" {
  description = "Optional availability domain name. Empty uses the first domain in the region. Ampere capacity is often only in one domain."
  type        = string
  default     = ""
}

variable "name" {
  description = "Display name for the instance and network."
  type        = string
  default     = "tomo"
}

variable "boot_volume_gb" {
  description = "Size of the only disk, the boot volume. Always Free block storage is 200 GB total. This stack allows 50–100 GB and no second disk."
  type        = number
  default     = 100

  validation {
    condition     = var.boot_volume_gb >= 50 && var.boot_volume_gb <= 100
    error_message = "Boot volume must be 50–100 GB. Always Free includes 200 GB of block storage, and this stack has no second disk."
  }
}

# Not variables. A tfvars file cannot raise these.
locals {
  shape         = "VM.Standard.A1.Flex"
  ocpus         = 2
  memory_in_gbs = 12
  availability_domain = (
    var.availability_domain != ""
    ? var.availability_domain
    : data.oci_identity_availability_domains.ads.availability_domains[0].name
  )
}

provider "oci" {
  region           = var.region
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
}

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

data "oci_core_images" "ubuntu" {
  compartment_id           = var.tenancy_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = local.shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"

  filter {
    name   = "display_name"
    values = ["^Canonical-Ubuntu-24.04-aarch64-.*$"]
    regex  = true
  }
}

resource "oci_core_vcn" "tomo" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = var.name
  dns_label      = var.name
}

resource "oci_core_internet_gateway" "tomo" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.tomo.id
  display_name   = var.name
  enabled        = true
}

resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.tomo.id
  display_name   = "${var.name}-public"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.tomo.id
  }
}

resource "oci_core_security_list" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.tomo.id
  display_name   = "${var.name}-public"

  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
  }

  ingress_security_rules {
    description = "HTTP"
    protocol    = "6"
    source      = "0.0.0.0/0"

    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    description = "HTTPS"
    protocol    = "6"
    source      = "0.0.0.0/0"

    tcp_options {
      min = 443
      max = 443
    }
  }

  ingress_security_rules {
    description = "HTTP/3, already published by Caddy"
    protocol    = "17"
    source      = "0.0.0.0/0"

    udp_options {
      min = 443
      max = 443
    }
  }

  ingress_security_rules {
    description = "SSH for deploy"
    protocol    = "6"
    source      = "0.0.0.0/0"

    tcp_options {
      min = 22
      max = 22
    }
  }
}

resource "oci_core_subnet" "public" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.tomo.id
  cidr_block                 = "10.0.1.0/24"
  display_name               = "${var.name}-public"
  dns_label                  = "public"
  route_table_id             = oci_core_route_table.public.id
  security_list_ids          = [oci_core_security_list.public.id]
  prohibit_public_ip_on_vnic = false
}

resource "oci_core_instance" "tomo" {
  availability_domain = local.availability_domain
  compartment_id      = var.compartment_ocid
  display_name        = var.name
  shape               = local.shape

  shape_config {
    ocpus         = local.ocpus
    memory_in_gbs = local.memory_in_gbs
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_gb
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    display_name     = var.name
    assign_public_ip = true
    hostname_label   = var.name
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(file("${path.module}/cloud-init.yaml"))
  }

  preserve_boot_volume = false

  lifecycle {
    precondition {
      condition = (
        local.shape == "VM.Standard.A1.Flex" &&
        local.ocpus == 2 &&
        local.memory_in_gbs == 12 &&
        var.boot_volume_gb >= 50 &&
        var.boot_volume_gb <= 100
      )
      error_message = "Always Free cap for this stack is VM.Standard.A1.Flex, 2 OCPUs, 12 GB RAM, and one 50–100 GB boot volume. Do not request a larger shape."
    }
  }
}

output "ip" {
  description = "Public IPv4. Set VM_HOST to this value before pnpm ssh or pnpm ship."
  value       = oci_core_instance.tomo.public_ip
}

output "domain" {
  description = "Hostname to put in DOMAIN. Caddy reads that env var, not this output."
  value       = var.domain
}

output "shape" {
  value = "${local.shape} ${local.ocpus} OCPU ${local.memory_in_gbs} GB"
}
