---
title: "Road to Declarative Systems"
date: 2024-07-27T12:50:29+02:00
draft: false
---

Over the past few years I have worked at different companies building data lakehouses/meshes, and one challenge that has been constant is the need to understand the state of things (cloud, platform, pipeline, computers, etc) and how to document and mutate the state of these in a straightforward manner.

## Why declarative systems?

Lets say you were tasked with ensuring that all cloud storage is configured in a manner which matches the new standards put in place by the security team.

Perhaps you would start by documenting the current state of things, probably by polling this data from an api, then you would need to figure out what needs to be changed, and then finally how to change the state of things to match the new standards.

However imagine if the state of these buckets was defined declaratively as code, you then could easily see the state as defined in the code, and then make changes to the code to match the new standards.

Tooling like terraform, kubernetes, an nix are all examples of industry leading tooling that allow you to define the state of things in code.

## Introduction to terraform

The big aha moment for me was when I started using terraform to manage Azure cloud infrastructure. Terraform uses a language called HCL (HashiCorp Configuration Language) to define the state, a simple example of this is shown below.

```hcl
"resource" "azurerm_resource_group" "example" {
  name     = "example-resources"
  location = "West Europe"
}

"resource" "azurerm_storage_account" "example" {
  name                     = "examplestorageaccount"
  resource_group_name      = azurerm_resource_group.example.name
  location                 = azurerm_resource_group.example.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

You can then run `terraform plan` to see what changes will be made to the state, and then `terraform apply` to make the changes if you are happy with the plan. No where in this code do we define how to make the changes, terraform figures this out for us, all thanks to the plethora of providers that are available.

Now with infrastructure to check the state I can grep the codebase, and making a change is a simple as a pull request. Of course there are some challenges, as drift can occur due to external changes, but these can be mitigated with good practices.

## Down the nix rabbit hole

I have done a lot of distro hopping over the years, and could never really find one that allowed me to have the level of control I wanted over my system - letting me use bleeding edge software, but also ensuring that everything was stable. My arch system would always break due to some update to nvidia drivers, and my ubuntu system would always be out of date.

Additionally to ensure that my development environment was consistent I made a dotfiles repo, which I would use to install all the software I needed on a new system. However this was always a pain as I used mac/wsl for work, and linux for personal use and had to make this work for all the systems.

A then colleague of mine introduced me to nix, and I was blown away by the power of the system and was surprised it wasn't more popular. Nix uses a functional programming language to define the state of the system, and then uses the nix package manager to ensure that the system is in the desired state - this should be starting to sound familiar.

I'm not going to lie - it was a steep learning curve and the ecosystem is quite fragmented. There are nix flakes which introduces dependency locking, however it is still considered experimental even though most people are using them. Also there are partnering modules such as darwin-nix which manages mac clients and home-manage which manages setting up home environments (ala dotfiles). You also need to choose a release channel or choose unstable, I typically use the latest stable release but use overlays to get the latest software where required.

Nix has finally enabled me to have a consistent and declarative development environment across all my systems (controlling software and configurations), and I can now easily install software on a new system by running a couple of commands. Day one is now a breeze I am up and running in minutes.

## Kubernetes

Kubernetes is another example of a system which allows you to define the state of the system in code. You define the desired state in a yaml file called a manifest and then apply this to the cluster. Kubernetes will then figure out how to make the changes to the cluster to match the desired state. This like terraform allows you easily inspect the diff and know what changes will be made.

I won't lie, kubernetes is a beast and there is a lot to learn, but the power of the system is undeniable. There are tools like helm and kustomize which allow templating/overlay type functionality the yaml manifests (which terraform and nix have built in because they are programming languages). Also there are tools like argo-cd which allow you to manage the state of the cluster in a gitops manner, meaning that it will constantly poll the git repo and ensure that the cluster is in the desired state (something that needs to be handled manually with terraform).

## Summary

I hope this post has given you some insight into the power of declaratively defining systems, and how they can be used to manage the state of things in a straightforward manner. I have only scratched the surface of the tools available, and I am excited to see what the future holds for this space.

As with anything there is a trade-off in that more work needs to be put in upfront. Much like writing tests or cicd pipelines, the benefits are not immediately apparent, but over time the investment will pay off and you will be thanking yourself if you ever need to rebuild the system from scratch.

Please let me know if you would like me to expand on any of the topics mentioned in this post.

## References

### Terraform

[terraform](https://www.terraform.io/)
[azure provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
[aws provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
[gcp provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)

### Nix

[my nix config](https://github.com/kirksw/nixfiles-v2)
[nixos](https://nixos.org/)
[nix flakes](https://nixos.wiki/wiki/Flakes)
[nix-darwin](https://github.com/LnL7/nix-darwin)
[home-manager](https://nix-community.github.io/home-manager/)

### Kubernetes

[kubernetes](https://kubernetes.io/)
[helm](https://helm.sh/)
[kustomize](https://kustomize.io/)
[argo-cd](https://argoproj.github.io/argo-cd/)
