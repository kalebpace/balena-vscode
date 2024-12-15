{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    utils.url = "github:numtide/flake-utils";
    pnpm2nix.url = "github:nzbr/pnpm2nix-nzbr";
  };

  outputs = { self, nixpkgs, utils, pnpm2nix }:
    utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { 
          inherit system; 
          overlays = [
            pnpm2nix.overlays.default
          ];
        };

        vsCodeWithExtensions = with pkgs; vscode-with-extensions.override {
          vscode = vscodium;
          vscodeExtensions = with vscode-extensions; [
            jnoortheen.nix-ide
            asvetliakov.vscode-neovim
            viktorqvarfordt.vscode-pitch-black-theme
          ];
        };
      in rec {
        packages = rec {
          default = vsix;

          vsix = with pkgs; stdenv.mkDerivation (finalAttrs: rec { 
            name = "vsix";
            version = "0.0.0";
            src = ./.;
            buildInputs = [ nodePackages.pnpm ];
            buildPhase = ''
              cp -r ${pnpmPackage} ./dist
              ln -s ${pnpmPackage.passthru.nodeModules}/node_modules node_modules
              pnpm install
              pnpm exec vsce package ${finalAttrs.version} --no-dependencies ${lib.strings.optionalString finalAttrs.prerelease "--pre-release"}
            '';
            installPhase = ''
              mkdir -p $out
              cp -r ./balena-vscode-*.vsix $out
            '';

            prerelease = false;
            pnpmPackage = with pkgs; mkPnpmPackage {
              inherit src version;
              script = if finalAttrs.prerelease == true then "build-dev" else "build-prod";
            };
          });
          
          prod = vsix.overrideAttrs { prerelease = false; };
          dev = vsix.overrideAttrs { prerelease = true; };
        };

        apps = rec {
          default = publish-release;
          publish-release = with pkgs; {
            type = "app";
            program = toString (pkgs.writers.writeBash "publish-release" ''
              ${nodePackages.pnpm}/bin/pnpm install
              ${nodePackages.pnpm}/bin/pnpm exec vsce publish --packagePath ${packages.vsix}/balena-vscode-*.vsix
              ${nodePackages.pnpm}/bin/pnpm exec ovsx publish --packagePath ${packages.vsix}/balena-vscode-*.vsix
            '');
          };

          publish-prerelease = with pkgs; {
            type = "app";
            program = toString (pkgs.writers.writeBash "publish-prerelease" ''
              ${nodePackages.pnpm}/bin/pnpm install
              ${nodePackages.pnpm}/bin/pnpm exec vsce publish --packagePath ${packages.vsix.overrideAttrs { prerelease = true; }}/balena-vscode-*.vsix
              ${nodePackages.pnpm}/bin/pnpm exec ovsx publish --packagePath ${packages.vsix.overrideAttrs { prerelease = true; }}/balena-vscode-*.vsix
            '');
          };
        };

        devShells = {
          default = with pkgs; mkShell {
            nativeBuildInputs = [
              vsCodeWithExtensions
              neovim
              nodePackages.pnpm
            ];
          };
        };
      }
    );
}
