import React from 'react';
import styled from 'styled-components';
import { getAvatarCdnUrl } from '../../lib/discord';
import { DiscordAccountType } from '../../lib/schemas/DiscordAccount';

const AvatarContainer = styled.div<{ size: number }>`
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  font-size: ${({ size }) => 0.6 * size}px;
  background-color: white;
`;

const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
`;

const AvatarInitial = styled.div`
  width: 90%;
  height: 90%;
  margin: 5%;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Avatar = React.memo(({
  size, inline, _id, displayName, discordAccount,
}: {
  size: number;
  inline?: boolean;
  _id?: string; // hashed to produce a globally consistant background color for the fallback avatar
  displayName?: string;
  discordAccount?: DiscordAccountType;
}) => {
  const makeDiscordAvatar = () => {
    const urls = Array.from(Array(3), (_, i) => getAvatarCdnUrl(discordAccount, (i + 1) * size));
    if (urls.some((url) => !url)) { return null; }
    const srcSet = urls.map((url, i) => `${url} ${i + 1}x`).join(', ');
    const alt = `${displayName ?? 'Anonymous user'}'s Discord avatar`;
    return <AvatarImg alt={alt} src={urls[0]} srcSet={srcSet} />;
  };
  const makeInitialAvatar = () => {
    // Based on Sasha Trubetskoy's List of 20 Simple, Distinct Colors
    // https://sashamaps.net/docs/resources/20-colors/
    const palette = [
      ['#e6194B', '#ffffff'], ['#3cb44b', '#ffffff'], ['#ffe119', '#000000'],
      ['#4363d8', '#ffffff'], ['#f58231', '#ffffff'], ['#911eb4', '#ffffff'],
      ['#42d4f4', '#000000'], ['#f032e6', '#ffffff'], ['#bfef45', '#000000'],
      ['#fabed4', '#000000'], ['#469990', '#ffffff'], ['#dcbeff', '#000000'],
      ['#9A6324', '#ffffff'], ['#000000', '#ffffff'], ['#800000', '#ffffff'],
      ['#aaffc3', '#000000'], ['#808000', '#ffffff'], ['#ffd8b1', '#000000'],
      ['#000075', '#ffffff'], ['#a9a9a9', '#ffffff'],
    ];
    const initial = displayName ? displayName.trim().slice(0, 1).toUpperCase() : '?';
    const idSum = Array.from(_id ?? '').reduce((t, c) => t + c.codePointAt(0)!, 0);
    const [circleColor, initialColor] = palette[idSum % palette.length];
    const style = { backgroundColor: circleColor, color: initialColor };
    return <AvatarInitial style={style}>{initial}</AvatarInitial>;
  };

  const content = makeDiscordAvatar() || makeInitialAvatar();
  const inlineStyle = inline ? { display: 'inline-block' } : { };
  return <AvatarContainer size={size} style={inlineStyle}>{content}</AvatarContainer>;
});

export default Avatar;
