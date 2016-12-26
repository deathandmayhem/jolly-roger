import React from 'react';
import { Breadcrumb, BreadcrumbItem } from 'react-bootstrap';
import RRBS from 'react-router-bootstrap';

class NavAggregator {
  constructor() {
    this.mountedItems = [];
    this.mountedBars = [];
    const holder = this;

    class NavItem extends React.Component {
      // A component that doesn't render anything in the DOM, but uses lifecycle methods to add a
      // breadcrumb to be rendered in associated NavBar instances.
      componentWillMount() {
        holder.mountedItems.push(this);
        holder.forceUpdateNavbars();
      }

      componentDidUpdate() {
        holder.forceUpdateNavbars();
      }

      componentWillUnmount() {
        const index = holder.mountedItems.indexOf(this);
        holder.mountedItems.splice(index, 1);
        holder.forceUpdateNavbars();
      }

      render() {
        if (this.props.children) {
          return React.Children.only(this.props.children);
        } else {
          return null;
        }
      }
    }
    NavItem.propTypes = {
      itemKey: React.PropTypes.string, // key that we want to place on the breadcrumb
      to: React.PropTypes.string, // Route to which this item should link (if not the final item)
      label: React.PropTypes.string, // Text to place in the breadcrumb
      children: React.PropTypes.element,
    };

    class NavBar extends React.Component {
      // A component which materializes all the associated NavItems with Bootstrap breadcrumbs
      componentWillMount() {
        holder.mountedBars.push(this);
      }

      componentWillUnmount() {
        const index = holder.mountedBars.indexOf(this);
        holder.mountedBars.splice(index, 1);
      }

      render() {
        const ComponentClass = this.props.componentClass || Breadcrumb;
        const ItemComponentClass = this.props.itemComponentClass || BreadcrumbItem;
        const navItems = holder.mountedItems.map((item, index) => {
          const { to, label, itemKey } = item.props;
          const isLast = (index === (holder.mountedItems.length - 1));
          if (isLast) {
            return (
              <ItemComponentClass key={itemKey} className="jr-breadcrumb" active>
                {label}
              </ItemComponentClass>
            );
          } else {
            return (
              <RRBS.LinkContainer key={itemKey} to={to} active={false}>
                <ItemComponentClass className="jr-breadcrumb">
                  {label}
                </ItemComponentClass>
              </RRBS.LinkContainer>
            );
          }
        });

        return (
          <ComponentClass className="nav-breadcrumbs">
            {navItems}
          </ComponentClass>
        );
      }
    }
    NavBar.propTypes = {
      // Override the type of the container
      componentClass: React.PropTypes.instanceOf(React.Component),
      // Override the type of the items
      itemComponentClass: React.PropTypes.instanceOf(React.Component),
    };

    this.NavItem = NavItem;
    this.NavBar = NavBar;
  }

  forceUpdateNavbars() {
    this.mountedBars.forEach((aggregate) => {
      aggregate.forceUpdate();
    });
  }
}

const navAggregatorType = React.PropTypes.instanceOf(NavAggregator).isRequired;

export { NavAggregator, navAggregatorType };
